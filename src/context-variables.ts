export enum Context {
	// Whether the project has been inspected (true) or not (false)
	inspectedProject = 'inspectedProject',

	// Whether the user has clicked Login (true)
	isLoggingIn = 'isLoggingIn',

	// Whether the current user is not known (true)
	isAnonymous = 'isAnonymous'
}