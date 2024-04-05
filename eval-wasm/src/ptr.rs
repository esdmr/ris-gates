pub trait Readable<T> {
	unsafe fn read(&self, offset: usize) -> T;
}

impl<T> Readable<T> for &[T] {
	unsafe fn read(&self, offset: usize) -> T {
		self.as_ptr().add(offset).read()
	}
}

impl<T> Readable<T> for &mut [T] {
	unsafe fn read(&self, offset: usize) -> T {
		self.as_ptr().add(offset).read()
	}
}

pub trait Writable<T> {
	unsafe fn write(&mut self, offset: usize, val: T);
}

impl<T> Writable<T> for &mut [T] {
	unsafe fn write(&mut self, offset: usize, val: T) {
		self.as_mut_ptr().add(offset).write(val);
	}
}
