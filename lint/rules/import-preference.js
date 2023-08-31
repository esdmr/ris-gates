const path = require('node:path');
const {ESLintUtils} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			ImportDeclaration(node) {
				if (
					!node.source.value.startsWith('.') ||
					!context.getPhysicalFilename
				) {
					return;
				}

				const filename = context.getPhysicalFilename();
				const resolved = path.resolve(
					path.dirname(filename),
					node.source.value,
				);

				const isUsingNamespaceImport = node.specifiers.every(
					(child) => child.type === 'ImportNamespaceSpecifier',
				);
				const shouldBeUsingNamespaceImport =
					/([/\\])src\1(?:component\1|lib\1(?:search-mode|tile-type))/.test(
						resolved,
					);

				if (isUsingNamespaceImport !== shouldBeUsingNamespaceImport) {
					context.report({
						node,
						messageId: shouldBeUsingNamespaceImport
							? 'useNamespace'
							: 'useNamed',
					});
				}

				if (isUsingNamespaceImport && shouldBeUsingNamespaceImport) {
					for (const child of node.specifiers) {
						if (child.local.name.endsWith('Js')) {
							context.report({
								node: child.local,
								messageId: 'refactoredWrongly',
							});
						}
					}
				}
			},
		};
	},
	meta: {
		docs: {
			description: 'for consistency',
			recommended: 'warn',
		},
		messages: {
			useNamespace: 'Prefer namespace import for this module',
			useNamed: 'Prefer named import for this module',
			refactoredWrongly: 'Unexpected `Js` prefix for namespace import',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
