# KitCart Discover pet behavior

| Trigger | What the pet does |
|---|---|
| First visible visit | Starts at full roaming size in a separate left gutter beside the navbar. The navbar is excluded from dragging, keyboard movement, roaming, and return paths. Wide poses cannot paint over it. Plays Quick hello once per tab when motion is enabled, then returns to Idle. |
| 1–5 rapid taps or Enter/Space | Smiles for 1.5 seconds. A gap longer than 400 ms starts a new sequence. |
| Sixth rapid tap | Plays Shy once with heart eyes and blush. |
| No interaction for 14–26 seconds | Picks a look, lean, stroll, swim, or sit. No immediate repeat. Automatic walks and swims are time-limited. |
| Choose walk, run, or swim | Keeps looping and sampling waypoints across the full viewport until stopped. Translation follows toe pushes or swim strokes. Side-on Walk and Looking Patrol align their authored lateral steps with travel direction. It slows as it turns or arrives. Tap the pet, press Escape while focused, choose Stop roaming, or drag to interrupt. |
| Short, repeatable moves | Repeats short clips such as Bounce, Dance, Shadowbox, Startle, and Climb stairs. A manual Quick hello repeats. Open-ended clips blend back into their first pose. |
| Authored laps, falls, or leap | Laps preserve their running cycle and adapt their path to the available space without shrinking the pet. Falls and leaps retain their authored endings. Moves with a held pose still offer Reset to idle. |
| Drag the robot | Moves horizontally and vertically around the viewport. Grabbing it interrupts roaming. |
| Shift-drag or enable Rotate mode | Drag sideways for a full 360° yaw. Drag vertically to tilt the model. Rotate mode also works on touch. |
| Focus the robot and press arrow keys | Moves the pet. Add Shift to rotate. Press Home to send it back. |
| Return home | Returns to the dock using a randomized sequence of Stroll, Alternate stroll, Quick walk, Looking patrol, Side-on walk, Sprint, Comic escape, and Climb stairs. Changes gait at a loop boundary on longer trips. Reduced motion returns directly. |
| Navigate between storefront pages | The same pet stays at its current position through the route change, walks to its dock, and resumes random actions after a short pause. |
| Cart open or tab hidden | Hides and pauses the robot. Reduced motion skips automatic greetings and roaming. Manual controls remain available. |

Idle and all other moves use the same orthographic scale. Crouching, swimming, and falling still change the silhouette as the body changes pose.
