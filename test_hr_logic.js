function getNextEmployeeCodeMock(existingCodes) {
    let maxCode = 1000;

    existingCodes.forEach((code) => {
        const match = code.match(/\d+/);
        if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxCode) {
                maxCode = num;
            }
        }
    });

    let nextValue = maxCode + 1;

    const codeExists = (val) => existingCodes.includes(val);

    while (codeExists(String(nextValue))) {
        nextValue++;
    }

    return String(nextValue);
}

// Test Scenarios
const tests = [
    { name: "Empty database", input: [], expected: "1001" },
    { name: "Numeric only", input: ["1001", "1002"], expected: "1003" },
    { name: "Prefix codes", input: ["EMP-1001", "EMP-1002"], expected: "1003" },
    { name: "Mixed numeric and prefix", input: ["1001", "EMP-1002"], expected: "1003" },
    { name: "Collision with numeric string", input: ["1001", "1002"], expected: "1003" },
    { name: "Collision with non-numeric but numeric matching", input: ["1001", "1002", "1003"], expected: "1004" },
    { name: "Higher numeric exists in non-standard format", input: ["1001", "ABC-2000"], expected: "2001" },
    { name: "Gap in sequences", input: ["1001", "1005"], expected: "1006" },
];

tests.forEach(test => {
    const result = getNextEmployeeCodeMock(test.input);
    const passed = result === test.expected;
    console.log(`${passed ? '✅' : '❌'} [${test.name}] Expected: ${test.expected}, Got: ${result}`);
});
