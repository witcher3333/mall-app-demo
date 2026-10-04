export const mapConfigs = {
  hostel: {
    imageUrl: '/premium_hostel.svg',
    bounds: [[0, 0], [1000, 1000]],
    nodes: [
      { id: 'entrance', x: 780, y: 950 },
      { id: 'reception', x: 780, y: 850 },
      { id: 'hallway_south', x: 550, y: 850 },
      { id: 'common_room', x: 270, y: 750 },
      { id: 'hallway_mid_1', x: 550, y: 680 },
      { id: 'kitchen', x: 780, y: 590 },
      { id: 'hallway_mid_2', x: 550, y: 590 },
      { id: 'washrooms', x: 220, y: 440 },
      { id: 'hallway_north', x: 550, y: 440 },
      { id: 'dorm_b', x: 780, y: 240 },
      { id: 'hallway_far_north', x: 550, y: 240 },
      { id: 'dorm_a', x: 220, y: 180 }
    ],
    links: [
      { source: 'entrance', target: 'reception' },
      { source: 'reception', target: 'hallway_south' },
      { source: 'hallway_south', target: 'hallway_mid_1' },
      { source: 'hallway_mid_1', target: 'common_room' },
      { source: 'hallway_mid_1', target: 'hallway_mid_2' },
      { source: 'hallway_mid_2', target: 'kitchen' },
      { source: 'hallway_mid_2', target: 'hallway_north' },
      { source: 'hallway_north', target: 'washrooms' },
      { source: 'hallway_north', target: 'hallway_far_north' },
      { source: 'hallway_far_north', target: 'dorm_b' },
      { source: 'hallway_far_north', target: 'dorm_a' }
    ],
    locations: [
      { id: 'entrance', name: 'Main Entrance', category: 'Facilities' },
      { id: 'reception', name: 'Reception Desk', category: 'Facilities' },
      { id: 'common_room', name: 'Main Common Room', category: 'Social' },
      { id: 'kitchen', name: 'Communal Kitchen', category: 'Social' },
      { id: 'washrooms', name: 'Washrooms', category: 'Facilities' },
      { id: 'dorm_a', name: 'Dormitory A', category: 'Accommodation' },
      { id: 'dorm_b', name: 'Dormitory B', category: 'Accommodation' }
    ]
  },
  office: {
    imageUrl: '/office_map.svg',
    bounds: [[0, 0], [1000, 1000]],
    nodes: [
      { id: 'fire_exit', x: 900, y: 900 },
      { id: 'hallway_1', x: 800, y: 800 },
      { id: 'door_3', x: 800, y: 600 },
      { id: 'door_4', x: 500, y: 600 },
      { id: 'door_5', x: 200, y: 600 },
      { id: 'kitchen', x: 800, y: 400 },
      { id: 'washroom', x: 500, y: 400 },
      { id: 'meeting_room', x: 200, y: 200 }
    ],
    links: [
      { source: 'fire_exit', target: 'hallway_1' },
      { source: 'hallway_1', target: 'door_3' },
      { source: 'door_3', target: 'door_4' },
      { source: 'door_4', target: 'door_5' },
      { source: 'door_3', target: 'kitchen' },
      { source: 'door_4', target: 'washroom' },
      { source: 'door_5', target: 'meeting_room' }
    ],
    locations: [
      { id: 'meeting_room', name: 'Meeting Room', category: 'Meeting Rooms' },
      { id: 'kitchen', name: 'Kitchen', category: 'Facilities' },
      { id: 'washroom', name: 'Washroom', category: 'Facilities' },
      { id: 'fire_exit', name: 'Fire Exit', category: 'Facilities' },
      { id: 'door_3', name: 'Employee Workspace (Door 3)', category: 'Offices' },
      { id: 'door_4', name: 'Employee Workspace (Door 4)', category: 'Offices' },
      { id: 'door_5', name: 'Employee Workspace (Door 5)', category: 'Offices' }
    ]
  }
};
