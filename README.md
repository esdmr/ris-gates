# RIS Gates

Basic, over-minimalistic logic gate simulator. [RIS Gates
Page](https://esdmr.github.io/ris-gates/).

> **Warning**: The evaluation aspect of this project may display flashing
> lights.

## How does it work?

It uses a grid to place four types of tiles:

- IO (Input/Output): Allows you to toggle its state in evaluation mode.
- Negate (2 NOT gates): Inverts the input. One gate is horizontal, the other is
  vertical. This allows you to cross over two lines by connecting three negates.
- Conjoin (3-way OR Gate): Outputs towards the direction it is facing and takes
  input from every other direction.
- Disjoin (3-way split): Takes input from the direction it is facing and outputs
  every other direction.

Negate and IO do not output or take input themselves. Rather, a Conjoin or
Disjoin which is connected to them will.

In evaluation mode, you can either toggle IO states or step through the changes
in every tick. A tick consists of first updating all Negates, and then updating
everything else. Therefore, updates in logic gates using Negates may take more
than one tick to propagate. Because of that, there is also the option to skip to
the next stable tick. A stable tick is any tick where no updates happen. Note
that if a logic gate has any cycles — intentional or not — will not allow for a
stable tick to happen.

Note that there are some surprising behavior with Negate specifically. If you
are using a Conjoin to take output from a Negate, you should not use that
conjoin as an OR gate with non-Negate outputs. Doing that will cause a cycle.
(Although, unlike other kinds of cycles, it does not blink and so it is harder
to find it.)
