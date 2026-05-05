import('./slide-deck-ui.js').then(m => console.log('UI exports:', Object.keys(m).join(', '))).catch(e => { console.error('ERR:', e.message); console.error(e.stack); });
