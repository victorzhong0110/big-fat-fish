import {mountSound} from './v2-sound.js';
import {mountCharacterGallery} from './v2-character-gallery.js';
import { mountCombatPreview } from './v2/preview/host.js';
mountSound();
mountCharacterGallery();
mountCombatPreview('preview');
