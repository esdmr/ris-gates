pub type Edge = (usize, usize, usize, usize);

#[repr(u8)]
#[derive(PartialEq, Eq, Clone, Copy)]
pub enum EdgeType {
	_NoEdge = 0,
	PositiveEdge = 1,
	NegativeEdge = 2,
}
