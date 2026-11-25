import { mountInstruments } from './tide-instruments.js';
import { mountDepthSelector } from './tide-depth.js';
import {mountSettings,mountTitleMotion} from './v2-menu.js';
import {mountSound} from './v2-sound.js';
import {mountCharacterGallery} from './v2-character-gallery.js';
import { mountCombatPreview } from './v2/preview/host.js';
mountSound();
mountSettings();
mountTitleMotion();
mountCharacterGallery();
mountCombatPreview('preview');

mountDepthSelector();
mountInstruments();
