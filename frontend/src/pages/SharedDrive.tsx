import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder, File as FileIcon, Upload, Plus, Trash2, Download,
  ChevronRight, HardDrive, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DriveItem {
  name: string;
  is_dir: boolean;
  size_kb: number;
  modified: number;
}

const SharedDrive: React.FC = () => {
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/drive/list?path=${encodeURIComponent(currentPath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setItems(await res.json());
      } else {
        setError('Failed to load directory');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [currentPath, token]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: currentPath, name: newFolderName }),
      });
      if (res.ok) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);

    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        fetchItems();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (item: DriveItem) => {
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    const res = await fetch(`/api/drive/download?path=${encodeURIComponent(itemPath)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (item: DriveItem) => {
    if (!confirm(`Delete ${item.is_dir ? 'folder' : 'file'} "${item.name}"?`)) return;
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    try {
      await fetch(`/api/drive/delete?path=${encodeURIComponent(itemPath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const navigateTo = (folderName: string) => {
    setCurrentPath(prev => prev ? `${prev}/${folderName}` : folderName);
  };

  const navigateUp = () => {
    setCurrentPath(prev => {
      const parts = prev.split('/');
      parts.pop();
      return parts.join('/');
    });
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-6 pb-12 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <HardDrive className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Shared Drive</h1>
            <p className="text-slate-400 text-sm">Offline file storage accessible across LAN</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium text-slate-300 overflow-x-auto">
        <button
          onClick={() => setCurrentPath('')}
          className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 ${!currentPath ? 'text-emerald-400' : ''}`}
        >
          <HardDrive className="w-4 h-4" /> Root
        </button>
        {pathParts.map((part, index) => {
          const pathToHere = pathParts.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={pathToHere}>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              <button
                onClick={() => setCurrentPath(pathToHere)}
                className={`hover:text-emerald-400 transition-colors ${index === pathParts.length - 1 ? 'text-emerald-400' : ''}`}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* File Browser */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
        
        {/* Create Folder Row */}
        {isCreatingFolder && (
          <div className="p-3 border-b border-slate-800 bg-slate-800/30 flex items-center gap-3">
            <Folder className="w-5 h-5 text-amber-400" />
            <form onSubmit={handleCreateFolder} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
              <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium">Save</button>
              <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm font-medium">Cancel</button>
            </form>
          </div>
        )}

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-red-400 text-center gap-2">
            <AlertCircle className="w-10 h-10" />
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : items.length === 0 && !isCreatingFolder ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-center">
            <Folder className="w-16 h-16 mb-3 text-slate-700" />
            <p className="font-medium text-slate-400">This folder is empty</p>
            <p className="text-sm mt-1">Upload files or create a folder</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-y-auto">
            
            {/* "Up" directory button if not at root */}
            {currentPath && (
              <div 
                onClick={navigateUp}
                className="flex items-center gap-4 p-3 hover:bg-slate-800/40 cursor-pointer text-slate-400 transition-colors"
              >
                <Folder className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-medium">..</span>
              </div>
            )}

            {items.map(item => (
              <div key={item.name} className="flex items-center gap-4 p-3 hover:bg-slate-800/40 group transition-colors">
                
                {/* Icon & Clickable Name */}
                <div 
                  className="flex flex-1 items-center gap-3 cursor-pointer min-w-0"
                  onClick={() => item.is_dir ? navigateTo(item.name) : handleDownload(item)}
                >
                  {item.is_dir ? (
                    <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </span>
                </div>

                {/* Details */}
                <div className="hidden sm:flex text-xs text-slate-500 w-24 tabular-nums">
                  {!item.is_dir && `${item.size_kb} KB`}
                </div>
                <div className="hidden md:flex text-xs text-slate-500 w-32">
                  {new Date(item.modified * 1000).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!item.is_dir && (
                    <button
                      onClick={() => handleDownload(item)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedDrive;
