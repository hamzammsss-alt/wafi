import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { JournalService } from './JournalService';

export class PayrollService {

    // =================================================================================================
    // 1. FINANCIAL REQUESTS (Advances & Penalties)
    // =================================================================================================

    static saveAdvance(data: any) {
        const installments = Math.max(1, Number(data.installments_count || 1));
        const amount = Number(data.amount || 0);
        const installmentAmount = Number((amount / installments).toFixed(4));

        const payload = {
            ...data,
            amount,
            installments_count: installments,
            installment_amount: installmentAmount
        };

        if (data.id) {
            db.prepare(`
                UPDATE hr_advances
                SET amount = @amount,
                    repayment_start_date = @repayment_start_date,
                    installments_count = @installments_count,
                    installment_amount = @installment_amount
                WHERE id = @id
            `).run(payload);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO hr_advances (id, employee_id, amount, currency, repayment_start_date, installments_count, installment_amount, status)
                VALUES (@id, @employee_id, @amount, @currency, @repayment_start_date, @installments_count, @installment_amount, 'APPROVED')
            `).run({ ...payload, id });
        }
        return { success: true };
    }

    static getActiveAdvances(employeeId: string) {
        return db
            .prepare("SELECT * FROM hr_advances WHERE employee_id = ? AND status IN ('APPROVED', 'ACTIVE')")
            .all(employeeId);
    }

    // =================================================================================================
    // 2. PAYROLL ENGINE
    // =================================================================================================

    static generatePayrollPreview(month: number, year: number) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

        // 1. Get Eligible Employees (Active + Contract)
        const employees = db.prepare(`
            SELECT e.*, c.basic_salary, c.hourly_rate, c.transport_allowance, c.communication_allowance, c.cost_of_living_allowance, c.salary_type
            FROM hr_employees e
            JOIN hr_employee_contracts c ON c.employee_id = e.id AND c.is_active = 1
            WHERE e.status = 'ACTIVE'
        `).all();

        // 1b. Fetch Commissions for this month
        const commissions = db.prepare(`
            SELECT employee_id, commission_amount 
            FROM hr_employee_commissions 
            WHERE period_start = ?
        `).all(startDate);

        // 1c. Fetch Production Totals for this month
        const production = db.prepare(`
            SELECT employee_id, SUM(quantity * rate) as total 
            FROM hr_employee_production_log 
            WHERE strftime('%Y-%m', production_date) = ? 
            GROUP BY employee_id
        `).all(monthStr);

        const preview = [];

        for (const emp of employees) {
            // 2. Attendance Summary
            const attendance = db.prepare(`
                SELECT 
                    COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_days,
                    SUM(overtime_hours) as total_ot_hours,
                    SUM(work_hours) as total_work_hours,
                    SUM(late_minutes) as total_late_minutes
                FROM hr_attendance_daily 
                WHERE employee_id = ? AND strftime('%Y-%m', date) = ?
            `).get(emp.id, monthStr);

            // 3. Calc Earnings
            let basic = emp.basic_salary || 0;
            // Adjustment: If COMMISSION only, basic might be 0. 
            // If PRODUCTION only, basic might be 0.

            const salaryType = emp.salary_type || 'FIXED';
            if (salaryType === 'COMMISSION' || salaryType === 'PRODUCTION') basic = 0;

            const hourlyRate = emp.hourly_rate || 0;
            const workHours = attendance?.total_work_hours || 0;

            // If HOURLY, calculate Basic based on hours
            if (salaryType === 'HOURLY') {
                // We need total work hours for the month.
                // The current query for attendance sum fetches 'total_ot_hours'. 
                // We need to fetch 'sum(work_hours)' as well.
                // Let's assume we update the query below.
                basic = workHours * hourlyRate;
            }


            // Allowances
            const fixedAllowances = (emp.transport_allowance || 0) + (emp.communication_allowance || 0) + (emp.cost_of_living_allowance || 0);

            // Commission
            const empComm = commissions.find((c: any) => c.employee_id === emp.id);
            const commissionAmount = empComm ? empComm.commission_amount : 0;

            // Production
            const empProd = production.find((p: any) => p.employee_id === emp.id);
            const productionAmount = empProd ? empProd.total : 0;

            // OT
            // For HOURLY, usually OT is (Rate * 1.5 * OT_Hours)
            // For FIXED, calculated from basic.

            let finalHourlyRate = 0;
            if (salaryType === 'HOURLY') {
                finalHourlyRate = hourlyRate;
            } else if (basic > 0) {
                finalHourlyRate = (basic / 30) / 8;
            }

            let dailyRate = 0;
            if (salaryType === 'HOURLY') {
                // For hourly, if we deduct absent days, we assume standard 8 hours? 
                // Or we don't deduct because they just didn't work.
                // But let's keep it safe.
                dailyRate = hourlyRate * 8;
            } else {
                dailyRate = basic > 0 ? (basic / 30) : 0;
            }

            const otAmount = (attendance?.total_ot_hours || 0) * finalHourlyRate * 1.5;

            // 4. Calc Deductions
            // Absent
            const absentDeduction = (attendance?.absent_days || 0) * dailyRate;

            // Advance Installements
            const advances = db.prepare(`
                SELECT id, COALESCE(installment_amount, amount / CASE WHEN COALESCE(installments_count, 0) <= 0 THEN 1 ELSE installments_count END) as installment 
                FROM hr_advances 
                WHERE employee_id = ? AND status IN ('APPROVED', 'ACTIVE')
                AND strftime('%Y-%m', repayment_start_date) <= ?
            `).all(emp.id, monthStr);

            let advanceDeduction = 0;
            advances.forEach((a: any) => advanceDeduction += a.installment);

            // Penalties
            const penalties = db.prepare(`
                SELECT SUM(amount) as total FROM hr_penalties 
                WHERE employee_id = ? AND is_deducted = 0 AND strftime('%Y-%m', date) = ?
            `).get(emp.id, monthStr);
            const penaltyDeduction = penalties?.total || 0;

            const totalDeductions = absentDeduction + advanceDeduction + penaltyDeduction;

            // NET SALARY
            const netSalary = basic + fixedAllowances + otAmount + commissionAmount + productionAmount - totalDeductions;

            preview.push({
                employee_id: emp.id,
                employee_name: `${emp.first_name} ${emp.last_name}`,
                salary_type: salaryType,
                basic_salary: basic,
                total_allowances: fixedAllowances,
                overtime_amount: otAmount,
                commission_amount: commissionAmount,
                production_amount: productionAmount,
                absent_days_deduction: absentDeduction,
                advance_deduction: advanceDeduction,
                penalty_deduction: penaltyDeduction,
                net_salary: netSalary
            });
        }

        return preview;
    }

    static postPayroll(month: number, year: number, slips: any[]) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const tx = db.transaction(() => {
            // 1. Create Period
            const periodId = uuidv4();
            db.prepare(`
                INSERT INTO hr_payroll_periods (id, month, year, status, generated_at, generated_by)
                VALUES (?, ?, ?, 'POSTED', CURRENT_TIMESTAMP, 'System')
            `).run(periodId, month, year);

            let totalNet = 0;

            // 2. Save Slips
            const insertSlip = db.prepare(`
                INSERT INTO hr_salary_slips (
                    id, payroll_period_id, employee_id, currency,
                    basic_salary, total_allowances, overtime_amount,
                    commission_amount, production_amount,
                    absent_days_deduction, advance_deduction, penalty_deduction,
                    net_salary
                ) VALUES (
                    @id, @period_id, @employee_id, 'ILS',
                    @basic_salary, @total_allowances, @overtime_amount,
                    @commission_amount, @production_amount,
                    @absent_days_deduction, @advance_deduction, @penalty_deduction,
                    @net_salary
                )
            `);

            for (const slip of slips) {
                insertSlip.run({
                    ...slip,
                    commission_amount: slip.commission_amount || 0,
                    production_amount: slip.production_amount || 0,
                    id: uuidv4(),
                    period_id: periodId
                });
                totalNet += slip.net_salary;

                // Mark penalties as deducted for this payroll month.
                db.prepare(`
                    UPDATE hr_penalties
                    SET is_deducted = 1, deduction_payroll_id = ?
                    WHERE employee_id = ?
                      AND COALESCE(is_deducted, 0) = 0
                      AND strftime('%Y-%m', date) = ?
                `).run(periodId, slip.employee_id, monthStr);

                // Update advance status based on elapsed installment months.
                db.prepare(`
                    UPDATE hr_advances
                    SET status = CASE
                        WHEN (
                            ((? * 12 + ?) - (CAST(strftime('%Y', repayment_start_date) AS INTEGER) * 12 + CAST(strftime('%m', repayment_start_date) AS INTEGER)) + 1)
                        ) >= CASE WHEN COALESCE(installments_count, 0) <= 0 THEN 1 ELSE installments_count END
                        THEN 'PAID'
                        ELSE 'ACTIVE'
                    END
                    WHERE employee_id = ?
                      AND status IN ('APPROVED', 'ACTIVE')
                      AND repayment_start_date IS NOT NULL
                      AND strftime('%Y-%m', repayment_start_date) <= ?
                `).run(year, month, slip.employee_id, monthStr);
            }

            // 3. GL Entry (Journal)
            // Use the helper to generate lines based on these very slips
            // Ideally we should sum up the slips we just inserted, or use the logic from generateSalaryEntry but scoped to these slips.
            // For simplicity, we'll re-calculate totals from the passed slips for the Journal Entry.

            let totalBasic = 0, totalAllowances = 0, totalOT = 0, totalComm = 0, totalProd = 0;
            let totalAbsent = 0, totalAdvance = 0, totalPenalty = 0;

            slips.forEach(s => {
                totalBasic += s.basic_salary || 0;
                totalAllowances += s.total_allowances || 0;
                totalOT += s.overtime_amount || 0;
                totalComm += s.commission_amount || 0;
                totalProd += s.production_amount || 0;

                totalAbsent += s.absent_days_deduction || 0;
                totalAdvance += s.advance_deduction || 0;
                totalPenalty += s.penalty_deduction || 0;
            });

            const totalEarnings = totalBasic + totalAllowances + totalOT + totalComm + totalProd;
            const totalDeductions = totalAbsent + totalPenalty; // Grouped usually as deduction or revenue

            // Ensure accounts exist (using helper)
            const accs = PayrollService.ensurePayrollAccountsExist();

            const lines = [
                {
                    account_id: accs['5101'], // Salaries Expense
                    description: `رواتب شهر ${month}/${year}`,
                    debit: totalEarnings,
                    credit: 0
                },
                {
                    account_id: accs['1150'], // Advances Asset (Credit to reduce asset)
                    description: `خصم سلف شهر ${month}/${year}`,
                    debit: 0,
                    credit: totalAdvance
                },
                {
                    account_id: accs['4250'], // Penalties/Other Revenue
                    description: `خصم جزاءات وغياب شهر ${month}/${year}`,
                    debit: 0,
                    credit: totalDeductions
                },
                {
                    account_id: accs['2201'], // Payable Liability
                    description: `صافي رواتب مستحقة ${month}/${year}`,
                    debit: 0,
                    credit: totalNet
                }
            ].filter(l => l.debit > 0 || l.credit > 0);

            JournalService.createJournalEntry({
                date: new Date().toISOString().split('T')[0],
                description: `استحقاق رواتب شهر ${month}/${year}`,
                voucher_type: 'PAYROLL', // Added required field
                branch_id: '1', // Default
                currency_id: 'ILS', // Default
                exchange_rate: 1,
                status: 'POSTED'
            }, lines as any[]); // Cast lines if typing is strict or mismatched


        });
        tx();
        return { success: true };
    }

    static getSlips(month: number, year: number) {
        return db.prepare(`
            SELECT s.*, 
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.employee_code,
                   j.title as job_title,
                   d.name as department_name
            FROM hr_salary_slips s
            JOIN hr_employees e ON s.employee_id = e.id
            LEFT JOIN hr_employee_contracts c ON c.employee_id = e.id AND c.is_active = 1
            LEFT JOIN hr_job_titles j ON c.job_title_id = j.id
            LEFT JOIN hr_departments d ON c.department_id = d.id
            JOIN hr_payroll_periods p ON s.payroll_period_id = p.id
            WHERE p.month = ? AND p.year = ?
            ORDER BY e.employee_code
        `).all(month, year);
    }

    static ensurePayrollAccountsExist() {
        const accounts = [
            { code: '5101', name: 'رواتب وأجور', type: 'EXPENSE', parent_code: '5100' },
            { code: '2201', name: 'ذمم موظفين - رواتب مستحقة', type: 'LIABILITY', parent_code: '2200' },
            { code: '1150', name: 'سلف موظفين', type: 'ASSET', parent_code: '1100' },
            { code: '4250', name: 'إيرادات أخرى / جزاءات', type: 'REVENUE', parent_code: '4200' }
        ];

        const accountIds: Record<string, string> = {};

        for (const acc of accounts) {
            let existing = db.prepare('SELECT id FROM accounts WHERE code = ?').get(acc.code);

            if (!existing) {
                const id = uuidv4();
                // Simple insert, assuming parent might not exist or we don't care about strict hierarchy for auto-created accounts in this fail-safe
                db.prepare(`
                    INSERT INTO accounts (id, code, name, type, balance, is_transactional, is_active)
                    VALUES (?, ?, ?, ?, 0, 1, 1)
                `).run(id, acc.code, acc.name, acc.type);
                existing = { id };
            }
            accountIds[acc.code] = existing.id;
        }

        return accountIds;
    }

    static generateSalaryEntry(month: number, year: number) {
        // 1. Get Totals
        const summary = db.prepare(`
            SELECT 
                SUM(basic_salary + total_allowances + overtime_amount + commission_amount + production_amount) as total_earnings,
                SUM(absent_days_deduction + penalty_deduction) as total_deductions,
                SUM(advance_deduction) as total_advances,
                SUM(net_salary) as total_net
            FROM hr_salary_slips s
            JOIN hr_payroll_periods p ON s.payroll_period_id = p.id
            WHERE p.month = ? AND p.year = ?
        `).get(month, year);

        if (!summary || !summary.total_earnings) throw new Error('لا يوجد بيانات رواتب لهذه الفترة');

        // 2. Ensure Accounts
        const accs = this.ensurePayrollAccountsExist();

        // 3. Prepare Lines
        // Dr. Salaries Expense (5101)
        // Cr. Advances (1150)
        // Cr. Penalties (4250) - Treated as Credit to Revenue or Contra-Expense
        // Cr. Salaries Payable (2201)

        const lines = [
            {
                account_id: accs['5101'],
                description: `رواتب شهر ${month}/${year}`,
                debit: summary.total_earnings,
                credit: 0
            },
            {
                account_id: accs['1150'],
                description: `خصم سلف شهر ${month}/${year}`,
                debit: 0,
                credit: summary.total_advances
            },
            {
                account_id: accs['4250'],
                description: `خصم جزاءات وغياب شهر ${month}/${year}`,
                debit: 0,
                credit: summary.total_deductions
            },
            {
                account_id: accs['2201'],
                description: `صافي رواتب مستحقة ${month}/${year}`,
                debit: 0,
                credit: summary.total_net
            }
        ];

        // Filter out zeros
        const validLines = lines.filter(l => l.debit > 0 || l.credit > 0);

        return { success: true, summary, lines: validLines };
    }

    // =================================================================================================
    // 3. END OF SERVICE
    // =================================================================================================

    static calculateEOS(employeeId: string, endDate: string) {
        const emp = db.prepare('SELECT * FROM hr_employees WHERE id = ?').get(employeeId);
        const contract = db.prepare('SELECT * FROM hr_employee_contracts WHERE employee_id = ? ORDER BY start_date DESC LIMIT 1').get(employeeId);

        if (!emp || !contract) throw new Error('Employee or Contract not found');

        const start = new Date(contract.start_date); // Should use original join date if available
        const end = new Date(endDate);

        // Calculate diff in years
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        // Law: 1 month salary per year (usually). 
        // 1/3 if resigned < 5 years? (Simple version for now: 1 month per year)

        let salary = contract.basic_salary || 0;
        // Add specific allowances if law requires (usually basic + fixed allowances)
        salary += (contract.transport_allowance || 0) + (contract.communication_allowance || 0) + (contract.cost_of_living_allowance || 0);

        const amount = years * salary;

        return {
            employee_name: `${emp.first_name} ${emp.last_name}`,
            join_date: contract.start_date,
            end_date: endDate,
            years_of_service: years.toFixed(2),
            last_gross_salary: salary,
            amount: amount.toFixed(2)
        };
    }
}
