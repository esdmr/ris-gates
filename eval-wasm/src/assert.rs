use core::hint::unreachable_unchecked;

/// # Safety
///
/// It is undefined behavior for the condition to be false. Caller must make
/// sure that the condition always holds.
#[allow(clippy::module_name_repetitions)]
pub const unsafe fn assert_unchecked(condition: bool) {
	if !condition {
		// Safety: Caller must uphold safety.
		unsafe {
			unreachable_unchecked();
		}
	}
}
