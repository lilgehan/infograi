import('./v3/slide-deck-ui.js').then(m => console.log('UI:', Object.keys(m).sort().join(', ')));
import('./v3/slide-renderer.js').then(m => console.log('renderer:', Object.keys(m).sort().join(', ')));
import('./v3/slide-templates.js').then(m => console.log('templates:', Object.keys(m).sort().join(', ')));
