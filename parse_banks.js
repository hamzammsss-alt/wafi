const fs = require('fs');
const path = require('path');

const htmlPath = 'C:\\Users\\Ahmad Sultan\\Downloads\\البنوك والفروع (فعال).html';
const outputPath = 'c:\\WAFI ERP\\config\\initial_banks.json';

try {
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Regex to match TR rows
    // This is a simple regex parsing, assuming consistent formatting as seen in the artifact
    // <TR><TD ...><DIV>content</DIV></TD> ... </TR>

    // Split by <TR> to get rows
    const rows = html.split('<TR>');

    const banks = [];

    // Skip header rows (first 3 usually in this structure based on viewing)
    // The viewer showed first row is headers.

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.includes('<TD')) continue;

        // Extract cells: simple regex to find content between <DIV> and </DIV>
        // Note: The file has styles in TDs, so we match <TD.*?><DIV>(.*?)</DIV></TD>

        const cells = [];
        const cellRegex = /<TD.*?><DIV>(.*?)<\/DIV><\/TD>/gi;
        let match;

        // We need to capture all matches
        // Global exec loop
        while ((match = cellRegex.exec(row)) !== null) {
            cells.push(match[1].replace(/&nbsp;/g, ' ').trim());
        }

        if (cells.length < 5) continue; // Not a valid data row

        // Based on analysis:
        // 0: Number (04:031)
        // 1: Bank Code
        // 2: Branch Code
        // 3: Full Name
        // ...
        // 5: Name Ar
        // 6: Name En
        // 7: Name He
        // ...
        // 17: Swift (Verify exact index)
        // 18: Routing
        // 19: Address

        // Let's count properly from the header view:
        // Header row has ~22 columns.
        // The cells extraction might be tricky if there are nested tags? 
        // The viewer shows <DIV>text</DIV>.

        // Check if it's a header row
        if (cells[0] === 'الرقم' || cells[0] === 'بنك') continue;

        const bank = {
            id: cells[0], // 01:001
            bank_code: cells[1],
            branch_code: cells[2],
            name_ar: cells[5],
            name_en: cells[6],
            name_he: cells[7],
            swift_code: cells[17],
            routing_no: cells[18],
            address: cells[19],
            is_local: 1 // Assume lists provided are local
        };

        // Filter out empty rows or garbage
        if (bank.bank_code && bank.name_ar) {
            banks.push(bank);
        }
    }

    console.log(`Parsed ${banks.length} banks.`);
    fs.writeFileSync(outputPath, JSON.stringify(banks, null, 2));
    console.log(`Saved to ${outputPath}`);

} catch (e) {
    console.error('Error:', e);
}
