const {ESLintUtils, AST_NODE_TYPES} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			ObjectExpression(node) {
				context.report({
					node,
					messageId: 'object',
				});
			},
			TSTupleType(node) {
				context.report({
					node,
					messageId: 'tuple',
				});
			},
			TSAsExpression(node) {
				if (
					node.expression.type === AST_NODE_TYPES.ArrayExpression &&
					node.typeAnnotation.type ===
						AST_NODE_TYPES.TSTypeReference &&
					node.typeAnnotation.typeName.type ===
						AST_NODE_TYPES.Identifier &&
					node.typeAnnotation.typeName.name === 'const'
				) {
					context.report({
						node,
						messageId: 'array',
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description:
				'See if you can create a class instead (for performance reasons)',
			recommended: 'warn',
		},
		messages: {
			object: 'Unexpected object literal',
			array: 'Unexpected tuple literal',
			tuple: 'Unexpected tuple type',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
