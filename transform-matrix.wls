#!/usr/bin/env wolframscript

translateToCenter = TranslationTransform[-{width - 1, height - 1} / 2]
translateBack = TranslationTransform[{realWidth - 1, realHeight - 1} / 2]
reflectHorizontally = ReflectionTransform[{1, 0}]
reflectVertically = ReflectionTransform[{0, 1}]

rotate = (
  RotationTransform[k] /.
  {Sin[k] -> sin, Cos[k] -> cos}
)

output[t_TransformationFunction] := t //
  (#[{x, y}] &) //
  FullSimplify //
  InputForm //
  Print

Print["No reflection"]
output[
  translateBack .
  rotate .
  translateToCenter
]

Print["\nHorizontal reflection"]
output[
  translateBack .
  reflectHorizontally .
  rotate .
  translateToCenter
]

Print["\nVertical reflection"]
output[
  translateBack .
  reflectVertically .
  rotate .
  translateToCenter
]

Print["\nFull reflection"]
output[
  translateBack .
  reflectVertically .
  reflectHorizontally .
  rotate .
  translateToCenter
]
