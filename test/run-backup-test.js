// Headless test for BackupSystem using jsdom and fake-indexeddb
const fs = require('fs');
const { JSDOM } = require('jsdom');
const fakeIndexedDB = require('fake-indexeddb');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

(async function(){
    try {
        // Create a JSDOM window
        const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { runScripts: 'outside-only' });
        const window = dom.window;

        // Provide browser globals
        window.indexedDB = fakeIndexedDB;
        window.IDBKeyRange = FDBKeyRange;
        window.navigator = { userAgent: 'node.js', platform: process.platform };
        window.document = dom.window.document;
        window.location = { reload: () => { console.log('[window] reload called'); } };

        // Minimal UI mock
        window.ui = {
            showNotification: (msg, type) => console.log('[UI]', type, msg),
            updateExportHistory: () => console.log('[UI] updateExportHistory'),
            updateBackupStatus: () => console.log('[UI] updateBackupStatus'),
            updateSettingsUI: () => console.log('[UI] updateSettingsUI')
        };

        // Load database.js into the window
        const dbCode = fs.readFileSync('js/database.js', 'utf8');
        window.eval(dbCode);

        // Ensure db is available on window
        if (!window.Database) throw new Error('Database class not found after eval');
        window.db = new window.Database();
        // Also expose db as a global variable name for scripts that expect it
        window.eval('var db = window.db;');

        // Initialize DB
        console.log('Initializing DB...');
        await window.db.init();
        console.log('DB initialized (stores):', Array.from(window.db.db.objectStoreNames));

        // Load backup-system.js into the window
        const backupCode = fs.readFileSync('js/backup-system.js', 'utf8');
        // Ensure ui global exists
        window.eval('var ui = window.ui;');
        window.eval(backupCode);

        if (!window.backupSystem) throw new Error('backupSystem instance not created');

        // Initialize backup system
        console.log('Initializing BackupSystem...');
        await window.backupSystem.init();

        // Create a manual backup
        console.log('Creating manual backup...');
        const manual = await window.backupSystem.createBackup('manual', 'TestManual');
        console.log('Manual backup created:', manual.name, manual.transactionCount, manual.size);

        // Export JSON
        console.log('Exporting JSON (options includeMetadata = true)...');
        const exported = await window.backupSystem.exportToJSON({ includeMetadata: true, includeCategories: true });
        console.log('Exported JSON summary:', { transactionCount: exported.transactionCount, categoryCount: exported.categoryCount });

        // Export CSV
        console.log('Exporting CSV...');
        const csv = await window.backupSystem.exportToCSV();
        console.log('CSV length:', csv.length);

        // List backups
        const backups = await window.backupSystem.getAllBackups();
        console.log('Backups in store:', backups.length, backups.map(b => b.name));

        // Try import preview (parse exported JSON string back)
        const fakeFile = new (require('fs').Blob || require('buffer').Blob)([JSON.stringify(exported)], { type: 'application/json' });
        // Node doesn't have File class; skip importData file-based path. Instead, test replaceData directly using exported object
        const result = await window.backupSystem.replaceData(exported);
        console.log('Replace data result:', result);

        console.log('Test completed successfully');

    } catch (err) {
        console.error('Test error:', err);
        process.exitCode = 1;
    }
})();