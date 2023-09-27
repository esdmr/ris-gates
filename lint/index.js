module.exports = {
	rules: {
		'explained-casts': require('./rules/explained-casts.js'),
		'global-matchall': require('./rules/global-matchall.js'),
		'no-object-literals': require('./rules/no-object-literals.js'),
		'type-only-imports': require('./rules/type-only-imports.js'),
		'import-preference': require('./rules/import-preference.js'),
	},
};
