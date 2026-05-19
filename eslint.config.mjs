import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
})

const customConfig = [
	{
		ignores: ['.squad/**'],
	},
	...baseConfig,
]

export default customConfig
