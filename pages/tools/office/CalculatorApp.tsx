import React, { useState, useEffect, useRef } from 'react';
import {
    Calculator, History, Trash2, Delete,
    Maximize2, Minimize2, Settings, X
} from 'lucide-react';
import * as math from 'mathjs';

interface HistoryItem {
    expression: string;
    result: string;
    timestamp: Date;
}

export const CalculatorApp = () => {
    const [display, setDisplay] = useState('');
    const [result, setResult] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isScientific, setIsScientific] = useState(false);

    // Auto-scroll to bottom of history
    const historyEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showHistory) {
            historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, showHistory]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key;
            if (/[0-9]/.test(key)) handleInput(key);
            if (['+', '-', '*', '/', '%', '.', '(', ')'].includes(key)) handleInput(key);
            if (key === 'Enter') handleCalculate();
            if (key === 'Backspace') handleBackspace();
            if (key === 'Escape') handleClear();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display]);

    const handleInput = (val: string) => {
        setDisplay(prev => prev + val);
    };

    const handleClear = () => {
        setDisplay('');
        setResult('');
    };

    const handleBackspace = () => {
        setDisplay(prev => prev.slice(0, -1));
    };

    const handleCalculate = () => {
        try {
            if (!display) return;
            // Replace visual operators with math operators
            const expression = display
                .replace(/×/g, '*')
                .replace(/÷/g, '/');

            const calculated = math.evaluate(expression);

            // Format result (limit decimals)
            const formattedResult = Number(calculated).toLocaleString('en-US', { maximumFractionDigits: 10 });

            setResult(formattedResult);
            setHistory(prev => [...prev, {
                expression: display,
                result: formattedResult,
                timestamp: new Date()
            }]);
            setDisplay(String(calculated));
        } catch (error) {
            setResult('Error');
        }
    };

    const ScientificButton = ({ label, func, color = 'bg-slate-700' }: any) => (
        <button
            onClick={() => handleInput(func)}
            className={`${color} text-white p-3 rounded-xl font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-sm`}
        >
            {label}
        </button>
    );

    const NumButton = ({ label, val, color = 'bg-slate-800' }: any) => (
        <button
            onClick={() => handleInput(val || label)}
            className={`${color} text-white text-xl font-bold p-4 rounded-2xl hover:bg-slate-700 active:scale-95 transition-all shadow-sm border-b-4 border-slate-900/50 active:border-b-0 active:translate-y-1`}
        >
            {label}
        </button>
    );

    const ActionButton = ({ label, action, color = 'bg-slate-700' }: any) => (
        <button
            onClick={action}
            className={`${color} text-white text-lg font-bold p-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-sm border-b-4 border-black/20 active:border-b-0 active:translate-y-1`}
        >
            {label}
        </button>
    );

    return (
        <div className="h-full bg-slate-100 flex items-center justify-center p-4" dir="ltr">
            <div className="bg-slate-900 p-1 rounded-[32px] shadow-2xl flex relative overflow-hidden max-w-5xl w-full max-h-[800px] aspect-[4/3] border-8 border-slate-800 ring-4 ring-slate-300">

                {/* Main Calculator Area */}
                <div className="flex-1 flex flex-col p-6 relative z-10">

                    {/* Header Controls */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsScientific(!isScientific)}
                                className={`p-2 rounded-lg transition-colors ${isScientific ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                                title="Scientific Mode"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                                title="History"
                            >
                                <History size={18} />
                            </button>

                        </div>
                        <h2 className="text-slate-500 font-medium flex items-center gap-2">
                            <Calculator size={16} /> WAFI Calc Pro
                        </h2>
                    </div>

                    {/* Display Screen */}
                    <div className="bg-black/40 rounded-3xl p-6 mb-6 flex-1 flex flex-col justify-end text-right relative backdrop-blur-sm border border-white/5">
                        <div className="text-slate-400 text-lg mb-2 font-mono h-6 overflow-hidden">{result ? display : ''}</div>
                        <input
                            type="text"
                            value={display}
                            onChange={(e) => setDisplay(e.target.value)}
                            className="bg-transparent text-5xl font-bold text-white w-full text-right outline-none font-mono tracking-wider"
                            placeholder="0"
                        />
                    </div>

                    {/* Keypad */}
                    <div className="flex gap-4 h-[60%]">

                        {/* Scientific Keys (Collapsible) */}
                        {isScientific && (
                            <div className="grid grid-cols-2 gap-3 w-40 animate-in slide-in-from-left duration-300">
                                <ScientificButton label="sin" func="sin(" color="bg-indigo-600" />
                                <ScientificButton label="cos" func="cos(" color="bg-indigo-600" />
                                <ScientificButton label="tan" func="tan(" color="bg-indigo-600" />
                                <ScientificButton label="log" func="log(" color="bg-indigo-600" />
                                <ScientificButton label="ln" func="log(" color="bg-indigo-600" /> {/* mathjs log is natural log? check docs or use math.log */}
                                <ScientificButton label="(" func="(" color="bg-slate-600" />
                                <ScientificButton label=")" func=")" color="bg-slate-600" />
                                <ScientificButton label="^" func="^" color="bg-slate-600" />
                                <ScientificButton label="√" func="sqrt(" color="bg-slate-600" />
                                <ScientificButton label="π" func="pi" color="bg-slate-600" />
                                <ScientificButton label="e" func="e" color="bg-slate-600" />
                                <ScientificButton label="!" func="!" color="bg-slate-600" />
                            </div>
                        )}

                        {/* Standard Keys */}
                        <div className={`grid grid-cols-4 gap-4 flex-1 transition-all duration-300`}>
                            <ActionButton label="AC" action={handleClear} color="bg-red-500" />
                            <ActionButton label={<Delete size={24} />} action={handleBackspace} color="bg-slate-600" />
                            <NumButton label="%" val="%" color="bg-slate-600" />
                            <NumButton label="÷" val="/" color="bg-orange-500" />

                            <NumButton label="7" />
                            <NumButton label="8" />
                            <NumButton label="9" />
                            <NumButton label="×" val="*" color="bg-orange-500" />

                            <NumButton label="4" />
                            <NumButton label="5" />
                            <NumButton label="6" />
                            <NumButton label="-" color="bg-orange-500" />

                            <NumButton label="1" />
                            <NumButton label="2" />
                            <NumButton label="3" />
                            <NumButton label="+" color="bg-orange-500" />

                            <NumButton label="0" className="col-span-2" />
                            <NumButton label="." />
                            <ActionButton label="=" action={handleCalculate} color="bg-green-500" />
                        </div>
                    </div>

                </div>

                {/* History Sidebar */}
                {showHistory && (
                    <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 flex flex-col animate-in slide-in-from-right duration-300 absolute right-0 top-0 bottom-0 z-20 h-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <History size={20} className="text-blue-500" /> History
                            </h3>
                            <button onClick={() => setHistory([])} className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-500/10 transition">
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {history.length === 0 && (
                                <div className="text-center text-slate-500 mt-10">No history yet</div>
                            )}
                            {history.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setDisplay(item.result)}
                                    className="bg-slate-700/50 p-3 rounded-xl cursor-pointer hover:bg-slate-700 transition border border-transparent hover:border-slate-600 group"
                                >
                                    <div className="text-slate-400 text-sm mb-1 font-mono">{item.expression} =</div>
                                    <div className="text-white text-xl font-bold font-mono">{item.result}</div>
                                </div>
                            ))}
                            <div ref={historyEndRef} />
                        </div>
                        {/* Close button for history overlay on mobile/smaller screens if needed, 
                            but here we treat it as part of the frame */}
                        <button
                            onClick={() => setShowHistory(false)}
                            className="mt-4 w-full py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600"
                        >
                            Close
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
