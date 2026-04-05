import React, { useState } from 'react';

export const WorkflowSimulation = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runSimulation = async () => {
        setLoading(true);
        setLogs([]);
        setError(null);
        try {
            // @ts-ignore
            const result = await window.electronAPI.test.runFullWorkflow();
            if (result.success) {
                setLogs(result.logs || ['Success!']);
            } else {
                setLogs(result.logs || []);
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Workflow Simulation</h1>
            <p className="mb-4 text-gray-600">
                This tool simulates a full cycle:
                Master Data Creation → Purchase Request → PO → Invoice → Stock Check → Production Order → Execution.
            </p>

            <button
                onClick={runSimulation}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:bg-blue-300"
            >
                {loading ? 'Running...' : 'Run Full Workflow Test'}
            </button>

            {error && (
                <div className="mt-4 p-4 bg-red-100 text-red-700 rounded border border-red-200">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="mt-6 bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {logs.length === 0 && <span className="text-gray-500">Logs will appear here...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-gray-800 pb-1">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};
