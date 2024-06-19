import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-import-css';

export default {
  input: 'src/PFDTrafficMapPlugin.tsx',
  output: {
    file: 'dist/WTG1000PFDTrafficMap/wtg1000-pfd-traffic-map-plugin/PackageSources/Copys/wtg1000-pfd-traffic-map-plugin/Mods/PFDTrafficMapPlugin.js',
    format: 'iife',
    name: 'pfdTrafficMap',
    globals: {
      '@microsoft/msfs-sdk': 'msfssdk',
      '@microsoft/msfs-wtg1000': '(window.g1000nxipfd || window.g1000nximfd) || {}',
      '@microsoft/msfs-garminsdk': 'garminsdk'
    }
  },
  external: ['@microsoft/msfs-sdk', '@microsoft/msfs-garminsdk', '@microsoft/msfs-wtg1000'],
  plugins: [css({ output: 'PFDTrafficMap.css' }), resolve(), typescript()]
}