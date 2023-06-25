const {ESLintUtils} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			ObjectExpression(node) {
				context.report({
					node,
					messageId: 'object',
				});
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
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
