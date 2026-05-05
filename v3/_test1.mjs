import('./slide-deck.js').then(m => console.log('slide-deck OK')).catch(e => console.error('1:', e.message));
import('./slide-templates.js').then(m => console.log('slide-templates OK')).catch(e => console.error('2:', e.message));
import('./slide-renderer.js').then(m => console.log('slide-renderer OK')).catch(e => console.error('3:', e.message));
import('./smart-layouts.js').then(m => console.log('smart-layouts OK')).catch(e => console.error('4:', e.message));
import('./smart-diagrams.js').then(m => console.log('smart-diagrams OK')).catch(e => console.error('5:', e.message));
import('./grid.js').then(m => console.log('grid OK')).catch(e => console.error('6:', e.message));
