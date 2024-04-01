#![no_std]
#![allow(unused)]
use core::slice;
use wasm_bindgen::memory;
use wasm_bindgen::prelude::*;

trait ReadableSlice<T> {
    unsafe fn read(&self, offset: usize) -> T;
}

impl<T> ReadableSlice<T> for &[T] {
    unsafe fn read(&self, offset: usize) -> T {
        self.as_ptr().add(offset).read()
    }
}

impl<T> ReadableSlice<T> for &mut [T] {
    unsafe fn read(&self, offset: usize) -> T {
        self.as_ptr().add(offset).read()
    }
}

trait WritableSlice<T> {
    unsafe fn write(&mut self, offset: usize, val: T);
}

impl<T> WritableSlice<T> for &mut [T] {
    unsafe fn write(&mut self, offset: usize, val: T) {
        self.as_mut_ptr().add(offset).write(val);
    }
}

trait U32ReadableSlice<T>: ReadableSlice<T> {
    unsafe fn try_read(&self, offset: u32) -> Option<T> {
        if offset == u32::MAX {
            None
        } else {
            Some(self.read(offset as usize))
        }
    }
}

impl<T, K> U32ReadableSlice<T> for K where K: ReadableSlice<T> {}

trait Conjoin<T> {
    fn conjoin<F>(self, f: F) -> Option<T>
    where
        F: FnOnce() -> Option<T>;
}

impl Conjoin<bool> for Option<bool> {
    fn conjoin<F>(self, f: F) -> Option<bool>
    where
        F: FnOnce() -> Option<bool>,
    {
        match self {
            Some(false) => f(),
            _ => self,
        }
    }
}

type Edge = (u32, u32, u32, u32);

#[repr(u8)]
#[derive(PartialEq, Eq, Clone, Copy)]
enum EdgeType {
    NoEdge = 0,
    PositiveEdge = 1,
    NegativeEdge = 2,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(k: &str, t: u32, a: u32, b: u32, c: u32, d: u32, v: bool);
}

#[cfg(not(risg_prod))]
fn log_positive_edge(target: u32, edge: Edge, value: bool) {
    log("+", target, edge.0, edge.1, edge.2, edge.3, value);
}

#[cfg(risg_prod)]
fn log_positive_edge(target: u32, edge: Edge, value: bool) {
    // Nothing
}

#[cfg(not(risg_prod))]
fn log_negative_edge(target: u32, edge: Edge, value: bool) {
    log("-", target, edge.0, edge.1, edge.2, edge.3, value);
}

#[cfg(risg_prod)]
fn log_negative_edge(target: u32, edge: Edge, value: bool) {
    // Nothing
}

#[wasm_bindgen]
pub unsafe fn next_frame(
    vertices_ptr: *mut bool,
    vertices_len: usize,
    edges_ptr: *const u32,
    edge_types_ptr: *const u8,
) -> bool {
    let mut vertices = slice::from_raw_parts_mut(vertices_ptr, vertices_len);
    let edges = slice::from_raw_parts(edges_ptr as *const Edge, vertices_len);
    let edge_types = slice::from_raw_parts(edge_types_ptr as *const EdgeType, vertices_len);

    let mut anything_updated = false;

    // Make sure this loop terminates. If you created a loop with an IO
    // tile, it would have produced a sub-tick pulse and cause this loop to
    // never end. Since the worst-case scenario for a non-looping circuit is
    // equal to the number of positive edges, we will terminate at that
    // point, plus one more for good measure. (Of course, this scenario
    // implies that there will never be a stable tick, which technically is
    // not supported.)

    {
        let mut updated = true;
        let mut count = vertices_len + 1;

        for i in 0..vertices_len {
            if edge_types.read(i) != EdgeType::PositiveEdge {
                count -= 1;
            }
        }

        while (updated && count > 0) {
            updated = false;
            count -= 1;

            for i in 0..vertices_len {
                if edge_types.read(i) != EdgeType::PositiveEdge {
                    continue;
                }

                let edge = edges.read(i);
                let (a, b, c, d) = edge;
                let target = i as u32;

                let value = vertices
                    .try_read(a)
                    .conjoin(|| vertices.try_read(b))
                    .conjoin(|| vertices.try_read(c))
                    .conjoin(|| vertices.try_read(d))
                    .unwrap_or_default();

                if value != vertices.read(target as usize) {
                    log_positive_edge(target, edge, value);
                    vertices.write(target as usize, value);
                    updated = true;
                    anything_updated = true;
                }
            }
        }
    }

    // Since only Conjoins and Disjoins can interact with other tiles, two
    // negative edges can never connect to each other. Therefore, no need to
    // loop multiple times here.

    for i in 0..vertices_len {
        if edge_types.read(i) != EdgeType::NegativeEdge {
            continue;
        }

        let edge = edges.read(i);
        let (a, b, c, d) = edge;
        let target = i as u32;

        let value = !vertices
            .try_read(a)
            .conjoin(|| vertices.try_read(b))
            .conjoin(|| vertices.try_read(c))
            .conjoin(|| vertices.try_read(d))
            .unwrap_or_default();

        if value != vertices.read(target as usize) {
            log_negative_edge(target, edge, value);
            vertices.write(target as usize, value);
            anything_updated = true;
        }
    }

    anything_updated
}
