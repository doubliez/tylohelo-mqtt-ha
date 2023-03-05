
Files in this folder defines the interface between external units and sauna system.
Examples of external units: Smart Phone Apps, Tablet Apps, Home Automation system, PC variant of control panel.

The interface is based on Google Protocol Buffers, see
- https://code.google.com/p/protobuf/,
- https://developers.google.com/protocol�buffers/
- https://github.com/google/protobuf.

The interface uses Protocol Buffers main version 2. Language use is adapted for version 3, but as version 3 was in a "alpha" state when development of external units began version 2 was selected.

Messaged are documented so it should be possible to develop an external unit.
However, the interface does not describe the graphical user interface of the external unit - it can be very different and specific for different types of externals units.
Externals units which need to replicate or be similar to existing control panel GUI therefore need additional information.
Temporarily, to assist development of first release of Tyl� smart phone apps, notes on how message fields should be used are provided. These notes, marked #APP_GUI#, may be incomplete. The intention is to remove these notes in future revisions of the interface.


Start by looking into the files message.proto and connect.proto. These define the top-level message structure and the discovery and connection mechanism.

Version history

2015-05-08 ControlPanel 0.2.4663
* Special value introduced for Calendar program favorite reference to explicitly state no favorite reference.

2015-05-06 Control Panel version 0.2.4636
* Documented use of Enum_value_changed.water_level_slave_1

2015-05-05 Control Panel version 0.2.4622
* Added External_unit_features.connect_reject_door_switch, external system specifies whether it supports Connect_reply.CONNECT_REJECTED_DOORSWITCH
* Added Connect_reply.CONNECT_REJECTED_DOORSWITCH, new error code at login.

2015-05-05 Control Panel version 0.2.4611
* Removed deprecated External_to_sauna.state_request : replaced by External_to_sauna.general_command.SEND_STATE
* System type (standard, multi-steam, tylarium) added to announcement and connect_reply messages.

2015-04-24 Control Panel version 0.2.4566
* Added user message relay control board origin.

2015-04-10 Control Panel version 0.2.4469
* Presented value update - always sent i.e. not dependent on enable in panel.

2015-04-02 Control Panel version 0.2.4425
* Added node info
* Next descaling replaced by last descaling
* Added state descaling
* Added application description and version in Connect_reply

2015-03-30 Control Panel version 0.2.4406
* Added next active calendar program in presented values
* Added not allowed start fields

2015-03-24 Control Panel version 0.2.4379
* Presented temperature: filtered temperature sent wo taking panel filtering into account. i.e. always when changed.
* Clarified notes on app user interface use of fields.
* Added tank auto emptying fields

2015-03-20 Control Panel version 0.2.4364
* Added general command SEND_STATE (message State_reqeuest noted as deprecated)
* Update of descriptions in message.proto and connect.proto
* Values timeout's in Connect_reply changed.

2015-03-19 Control Panel version 0.2.4355
* Added external switch bath time and function
* Added user message
* Added fan control messages fields
* Added overheat limits (PCB and water tank)
* Added supported characters message and fields
* Added cleanup fields

2015-03-09 Control Panel version 0.2.4299
* Added feature description in interface (prepare for encrypted login).
* Added error log and general command.
* Added time time to allowed start.
* Added facility type and region in new messages for enumerated values.
* Moved water level from Sauna_state to (new) Enum_value_changed message.
* Added water tank standby temperature.

2015-02-27 Control Panel version 0.2.4254
* Initial version of interface to external units
