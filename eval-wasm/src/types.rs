pub type Edge = (usize, usize, usize, usize);

#[repr(u8)]
#[non_exhaustive]
#[derive(PartialEq, Eq, Clone, Copy)]
pub enum EdgeKind {
	Positive = 1,
	Negative = 2,
}
