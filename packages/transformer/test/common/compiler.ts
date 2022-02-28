/* istanbul ignore file */
import ts from 'typescript';
import path from 'path';
import fs from 'fs';
import { createSystem, createVirtualCompilerHost } from '@typescript/vfs';

export type TSChannelTransformerType = (program: ts.Program) => ts.TransformerFactory<ts.SourceFile>;

const TSCHANNEL_CORE_MODULE_NAME = '@tschannel/core';
const TSCHANNEL_PATH = path.resolve(__dirname, '../mock/Channel.ts');

const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Classic,
    target: ts.ScriptTarget.ESNext,
    strict: true,
    sourceMap: false,
    importHelpers: false,
    esModuleInterop: true,
    skipLibCheck: false,
    noImplicitAny: true,
    include: '/'
};

export type TranspileOptions = {
    options?: ts.CompilerOptions;
    channelTransformer?: TSChannelTransformerType,
    transformers?: Array<ts.TransformerFactory<ts.SourceFile>>;
};

export function transpile(code: string, transpileOptions: TranspileOptions): string {
    const options = Object.assign({}, compilerOptions, transpileOptions.options || {});
    options.suppressOutputPathCheck = true;
    options.allowNonTsExtensions = true;
    const mockTSChannelCode = fs.readFileSync(TSCHANNEL_PATH).toString('utf-8');

    const fsMap = new Map<string, string>();
    fsMap.set('index.ts', code);
    fsMap.set('/'+TSCHANNEL_CORE_MODULE_NAME+'.ts', mockTSChannelCode);
    fsMap.set('/lib.esnext.full.d.ts', ' ');

    const system = createSystem(fsMap);
    const host = createVirtualCompilerHost(system, options, ts);

    host.compilerHost.resolveModuleNames = (
        moduleNames: string[],
        containingFile: string,
        reusedNames: string[] | undefined,
        redirectedReference: ts.ResolvedProjectReference | undefined,
        options: ts.CompilerOptions): (ts.ResolvedModule | undefined)[] => {

        return moduleNames.map(moduleName => {
            const result = ts.resolveModuleName(moduleName, containingFile, options, {
                fileExists(fileName){
                    return fsMap.has(fileName) || ts.sys.fileExists(fileName);
                },
                readFile(fileName) {
                    return fsMap.get(fileName) || ts.sys.readFile(fileName);
                }
            });
            return result.resolvedModule;
        }).filter(Boolean);
    };
    const program = ts.createProgram({
        rootNames: ['index.ts'],
        options,
        host: host.compilerHost
    });

    const transformers: Array<ts.TransformerFactory<ts.SourceFile>> = [];
    if(transpileOptions.transformers) {
        transformers.push(...transpileOptions.transformers);
    }
    if(transpileOptions.channelTransformer) {
        transformers.push(transpileOptions.channelTransformer(program));
    }
    // console.info(program.getSourceFiles());
    program.emit(/*targetSourceFile*/ undefined, /*writeFile*/ undefined, /*cancellationToken*/ undefined, /*emitOnlyDtsFiles*/ undefined, {
        before: transformers
    });
    // console.log(result);
    return fsMap.get('index.js') || '';
}