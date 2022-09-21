import ts from 'typescript';

export class ChannelProgramContext {
    constructor(private readonly typeChecker: ts.TypeChecker) {}
    public get_classMethodSymbol!: ts.Symbol;
    public channelMethodSymbol?: ts.Symbol;
    public channelClassSymbol?: ts.Symbol;
    public variablesMap = new Map<ts.Type, ts.VariableDeclaration>();
    public functional_channel_rel_variables = new Set<ts.Symbol>();

    is_accessing_get_class_method(callExpression: ts.CallExpression, propertyExpression: ts.PropertyAccessExpression) {
        const propertyName = propertyExpression.name.text;
        if (propertyName !== 'get_class') {
            return false;
        }
        if(callExpression.typeArguments?.length !== 1) {
            return false;
        }
        const LeftHandSideExpressionSymbol = this.typeChecker.getSymbolAtLocation(propertyExpression.expression);
        return !!LeftHandSideExpressionSymbol && this.functional_channel_rel_variables.has(LeftHandSideExpressionSymbol);
    }

    recordChannelVariableIfPossible(node: ts.VariableDeclaration) {
        const typeChecker = this.typeChecker;
        const variables = this.functional_channel_rel_variables;
        const initializer = node.initializer;
        if(!initializer) {
            return;
        }
        const variableSymbol = typeChecker.getSymbolAtLocation(node.name);
        if(!variableSymbol) {
            return;
        }
        if(ts.isNewExpression(initializer)) {
            const classSymbol = typeChecker.getSymbolAtLocation(initializer.expression);
            if(classSymbol === this.channelClassSymbol) {
                variables.add(variableSymbol);
            }
        } else if(ts.isCallExpression(initializer)) {
            const expression = initializer.expression;
            if(ts.isPropertyAccessExpression(expression)) {
                const LeftHandSideExpression = expression.expression;
                const LeftHandSideExpressionSymbol = typeChecker.getSymbolAtLocation(LeftHandSideExpression);
                if(!LeftHandSideExpressionSymbol) {
                    return;
                }
                if(variables.has(LeftHandSideExpressionSymbol)) {
                    variables.add(variableSymbol);
                }
            } else if(ts.isIdentifier(expression)) {
                const methodSymbol = typeChecker.getSymbolAtLocation(expression);
                if(!!this.channelMethodSymbol && methodSymbol === this.channelMethodSymbol) {
                    variables.add(variableSymbol);
                }
            }
        }
    }
    recordChannelSymbolIfPossible(node: ts.ImportDeclaration) {
        const namedBindings = node.importClause?.namedBindings;
        if(namedBindings && ts.isNamedImports(namedBindings)) {
            const importElementsArray = namedBindings.elements.map(it => {
                const name = it.propertyName ? it.propertyName.text : it.name.text;
                return { name, importSpecifier: it, symbol: this.typeChecker.getSymbolAtLocation(it.name) };
            })
            const { symbol: channelMethodSymbol } = importElementsArray.find(it => it.name === 'channel') || {};
            if(channelMethodSymbol) {
                this.channelMethodSymbol = channelMethodSymbol;
            }
            const { symbol: channelClassSymbol } = importElementsArray.find(it => it.name === 'Channel') || {};
            if(channelClassSymbol) {
                this.channelClassSymbol = channelClassSymbol;
            }
        }
    }
}