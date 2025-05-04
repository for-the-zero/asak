import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';

export default {
    input: './src/index.js',
    output: [
        {
            file: 'dist/asakjs.esm.js',
            format: 'es',
            sourcemap: true
        },
        {
            file: 'dist/asakjs.cjs.js',
            format: 'cjs',
            sourcemap: true
        },
        {
            file: 'dist/asakjs.js',
            format: 'iife',
            name: 'asakjs',
            sourcemap: true
        }
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
        babel({
            exclude: 'node_modules/**'
        })
    ]
};
