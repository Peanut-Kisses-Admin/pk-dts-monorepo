import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Single application theme source of truth.
 * The product intentionally supports one visual mode only: light + maroon.
 */
export const MAROON_PALETTE = {
    50: '#fff5f5',
    100: '#ffe3e3',
    200: '#ffc9c9',
    300: '#f2a3a3',
    400: '#c85e60',
    500: '#800000',
    600: '#700000',
    700: '#600000',
    800: '#500000',
    900: '#3f0000',
    950: '#290000'
};

export const LIGHT_SURFACE_PALETTE = {
    0: '#ffffff',
    50: '#fcf9f9',
    100: '#f8f2f2',
    200: '#eee3e3',
    300: '#dfcece',
    400: '#b9a4a4',
    500: '#897474',
    600: '#695757',
    700: '#514242',
    800: '#352a2a',
    900: '#241b1b',
    950: '#160f0f'
};

export const BrandPreset = definePreset(Aura, {
    semantic: {
        primary: MAROON_PALETTE,
        colorScheme: {
            light: {
                surface: LIGHT_SURFACE_PALETTE,
                primary: {
                    color: '{primary.500}',
                    contrastColor: '#ffffff',
                    hoverColor: '{primary.600}',
                    activeColor: '{primary.700}'
                },
                highlight: {
                    background: '{primary.50}',
                    focusBackground: '{primary.100}',
                    color: '{primary.700}',
                    focusColor: '{primary.800}'
                }
            }
        }
    }
});
