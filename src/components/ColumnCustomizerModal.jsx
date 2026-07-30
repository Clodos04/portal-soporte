import React, { useState, useEffect } from 'react';

function ColumnCustomizerModal({ activeColumns, availableColumns, columnLabels, onClose, onSave }) {
  const [tempActive, setTempActive] = useState([...activeColumns]);
  const [tempAvailable, setTempAvailable] = useState([...availableColumns]);
  const [selectedToAdd, setSelectedToAdd] = useState(tempAvailable[0] || '');

  useEffect(() => {
    if (tempAvailable.length > 0 && !tempAvailable.includes(selectedToAdd)) {
      setSelectedToAdd(tempAvailable[0]);
    }
  }, [tempAvailable]);

  const handleAdd = () => {
    if (!selectedToAdd || !tempAvailable.includes(selectedToAdd)) return;
    setTempActive([...tempActive, selectedToAdd]);
    setTempAvailable(tempAvailable.filter(col => col !== selectedToAdd));
  };

  const handleRemove = (colToRemove) => {
    setTempActive(tempActive.filter(col => col !== colToRemove));
    setTempAvailable([...tempAvailable, colToRemove].sort());
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newActive = [...tempActive];
    [newActive[index - 1], newActive[index]] = [newActive[index], newActive[index - 1]];
    setTempActive(newActive);
  };

  const handleMoveDown = (index) => {
    if (index === tempActive.length - 1) return;
    const newActive = [...tempActive];
    [newActive[index + 1], newActive[index]] = [newActive[index], newActive[index + 1]];
    setTempActive(newActive);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
      <div className="max-w-4xl w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Personalizar lista de solicitudes</h2>
            <p className="text-sm text-slate-400 mt-1">Folio, Notas y Estatus están fijos por defecto.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="flex gap-8 p-6 flex-grow overflow-hidden">
          <div className="w-1/3 flex flex-col gap-4 border-r border-slate-700 pr-8">
            <label className="block text-sm font-medium text-slate-300">Elementos Disponibles</label>
            <div className="flex gap-2">
              <select 
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white outline-none"
                disabled={tempAvailable.length === 0}
              >
                {tempAvailable.length === 0 && <option value="">No hay más columnas</option>}
                {tempAvailable.map(col => (
                  <option key={col} value={col}>{columnLabels[col]}</option>
                ))}
              </select>
              <button 
                onClick={handleAdd}
                disabled={tempAvailable.length === 0}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 rounded-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="w-2/3 flex flex-col gap-2 h-96">
            <label className="block text-sm font-medium text-slate-300">Orden y Visibilidad</label>
            <div className="flex-grow border border-slate-700 rounded-lg p-3 bg-slate-900/50 overflow-y-auto space-y-2">
              {tempActive.map((col, index) => (
                <div key={col} className="flex justify-between items-center bg-slate-700 px-4 py-3 rounded-lg border border-slate-600 shadow-sm">
                  <span className="font-medium text-white">{columnLabels[col]}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-slate-400 hover:text-green-400 disabled:opacity-30 p-1 bg-slate-800 rounded">⬆</button>
                    <button onClick={() => handleMoveDown(index)} disabled={index === tempActive.length - 1} className="text-slate-400 hover:text-green-400 disabled:opacity-30 p-1 bg-slate-800 rounded">⬇</button>
                    <button onClick={() => handleRemove(col)} className="text-slate-400 hover:text-red-400 p-1 bg-slate-800 rounded ml-2">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/30 rounded-b-xl">
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-lg font-bold border border-slate-600">Cancelar</button>
          <button onClick={() => onSave(tempActive, tempAvailable)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg shadow-lg font-bold">Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
}

export default ColumnCustomizerModal;