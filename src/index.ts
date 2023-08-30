import * as autoSave from './component/auto-save.js';
import * as canvas from './component/canvas.js';
import * as dialogs from './component/dialog/index.js';
import * as eval_ from './component/eval.js';
import * as grid from './component/grid.js';
import * as hud from './component/hud/index.js';
import * as keyboard from './component/keyboard.js';
import * as pointer from './component/pointer.js';
import * as renderer from './component/renderer.js';
import * as storage from './component/storage.js';
import * as theme from './component/theme.js';
import * as wheel from './component/wheel.js';

storage.setup();
autoSave.setup();
grid.setup();
eval_.setup();
canvas.setup();
pointer.setup();
wheel.setup();
keyboard.setup();
theme.setup();
dialogs.setup();
hud.setup();
renderer.setup();
