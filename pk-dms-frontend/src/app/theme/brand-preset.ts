import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const redScale = {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
};

const lightSurface = {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a'
};

const darkSurface = {
    0: '#09090b',
    50: '#111111',
    100: '#171717',
    200: '#262626',
    300: '#404040',
    400: '#525252',
    500: '#737373',
    600: '#a3a3a3',
    700: '#d4d4d8',
    800: '#e5e5e5',
    900: '#f5f5f5',
    950: '#ffffff'
};

export const BrandPreset = definePreset(Aura, {
    semantic: {
        primary: redScale,
        colorScheme: {
            light: {
                surface: lightSurface
            },
            dark: {
                surface: darkSurface
            }
        }
    }
});
