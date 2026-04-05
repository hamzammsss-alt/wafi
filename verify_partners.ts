// Mock Electron environment variables
// @ts-ignore
process.resourcesPath = process.cwd();

const { PartnerService } = require('./electron/services/PartnerService');
const { db, initDB } = require('./electron/database');

// Initialize DB (Validation Fix)
console.log("Initializing DB...");
initDB('./wafi.db');

console.log("=== Verifying Unified Partner Service ===");

// 1. Create a Customer
console.log("\n1. Test: Create Customer (Should go to business_partners)");
const customerData = {
    code: 'CUST-TEST-001',
    name_ar: 'Test Customer Unified',
    type: 'CUSTOMER',
    is_active: 1,
    credit_limit: 5000
};

try {
    const custResult = PartnerService.savePartner(customerData);
    console.log("Customer Created ID:", custResult.lastInsertRowid || "Success");

    // Verify DB
    const custCheck = db.prepare("SELECT * FROM business_partners WHERE code = ?").get('CUST-TEST-001');
    if (custCheck) console.log("✅ Customer found in business_partners:", custCheck.name_ar);
    else console.error("❌ Customer NOT found in business_partners");

} catch (e) {
    console.error("❌ Failed to create customer:", e.message);
}

// 2. Create an Employee
console.log("\n2. Test: Create Employee (Should go to hr_employees via Facade)");
const employeeData = {
    code: 'EMP-TEST-001',
    name_ar: 'Ahmad Employee Unified',
    type: 'EMPLOYEE',
    is_active: 1,
    mobile: '0555555555',
    email: 'ahmad.emp@example.com',
    // HR Fields
    basic_salary: 3000
};

try {
    // Note: PartnerService.savePartner logic for employee expects name split
    const empResult = PartnerService.savePartner(employeeData);
    console.log("Employee Created Result:", empResult);

    // Verify DB
    const empCheck = db.prepare("SELECT * FROM hr_employees WHERE employee_code = ?").get('EMP-TEST-001');
    if (empCheck) {
        console.log("✅ Employee found in hr_employees:", empCheck.first_name, empCheck.last_name);

        // Verify Contract (Salary)
        const contractCheck = db.prepare("SELECT * FROM hr_employee_contracts WHERE employee_id = ?").get(empCheck.id);
        if (contractCheck && contractCheck.basic_salary === 3000) {
            console.log("✅ Employee Contract found with correct salary:", contractCheck.basic_salary);
        } else {
            console.error("❌ Employee Contract mismatch or missing");
        }
    }
    else console.error("❌ Employee NOT found in hr_employees");

} catch (e) {
    console.error("❌ Failed to create employee:", e.message);
}

// 3. Test Unified Fetch
console.log("\n3. Test: getPartners() (Should return both matching the interface)");
try {
    const partners = PartnerService.getPartners();
    const foundCustomer = partners.find(p => p.code === 'CUST-TEST-001');
    const foundEmployee = partners.find(p => p.code === 'EMP-TEST-001');

    if (foundCustomer && foundCustomer.type === 'CUSTOMER') console.log("✅ getPartners returned Customer");
    else console.error("❌ getPartners missing Customer");

    if (foundEmployee && foundEmployee.type === 'EMPLOYEE') console.log("✅ getPartners returned Employee");
    else console.error("❌ getPartners missing Employee");

} catch (e) {
    console.error("❌ getPartners failed:", e.message);
}

// Clean up
try {
    console.log("\nCleaning up...");
    db.prepare("DELETE FROM business_partners WHERE code = 'CUST-TEST-001'").run();
    const empToDelete = db.prepare("SELECT id FROM hr_employees WHERE employee_code = 'EMP-TEST-001'").get();
    if (empToDelete) {
        db.prepare("DELETE FROM hr_employee_contracts WHERE employee_id = ?").run(empToDelete.id);
        db.prepare("DELETE FROM hr_employees WHERE id = ?").run(empToDelete.id);
    }
    console.log("Cleanup done.");
} catch (e) { }

console.log("\n=== Test Complete ===");
