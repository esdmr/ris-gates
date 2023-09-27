const {ESLintUtils, AST_NODE_TYPES} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			CallExpression(node) {
				const arg0 = node.arguments[0];
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.property.name === 'matchAll' &&
					arg0?.type === AST_NODE_TYPES.Literal &&
					'regex' in arg0 &&
					!arg0.regex.flags.includes('g')
				) {
					context.report({
						messageId: 'global',
						node: arg0,
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description: 'matchAll requires a global RegExp',
			recommended: 'warn',
		},
		messages: {
			global: 'RegExp should be global',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
