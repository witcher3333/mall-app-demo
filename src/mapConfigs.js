export const mapConfigs = {
  ground_floor: {
    imageUrl: '/premium_hostel.svg',
    bounds: [[0, 0], [1000, 1000]],
    nodes: [
      { id: 'entrance', x: 500, y: 900 },
      { id: 'washroom', x: 200, y: 700 },
      { id: 'khaadi', x: 800, y: 700 },
      { id: 'outfitters', x: 800, y: 600 },
      { id: 'sapphire', x: 800, y: 500 },
      { id: 'howdy', x: 300, y: 400 },
      { id: 'kfc', x: 500, y: 400 },
      { id: 'saltnpepper', x: 700, y: 400 },
      { id: 'jfragrances', x: 200, y: 200 },
      { id: 'saeedghani', x: 400, y: 200 }
    ],
    links: [
      { source: 'entrance', target: 'washroom' },
      { source: 'entrance', target: 'kfc' },
      { source: 'washroom', target: 'howdy' },
      { source: 'kfc', target: 'howdy' },
      { source: 'kfc', target: 'saltnpepper' },
      { source: 'kfc', target: 'khaadi' },
      { source: 'khaadi', target: 'outfitters' },
      { source: 'outfitters', target: 'sapphire' },
      { source: 'howdy', target: 'jfragrances' },
      { source: 'jfragrances', target: 'saeedghani' }
    ],
    locations: [
      { id: 'khaadi', name: 'Khaadi', category: 'Clothing' },
      { id: 'outfitters', name: 'Outfitters', category: 'Clothing' },
      { id: 'sapphire', name: 'Sapphire', category: 'Clothing' },
      { id: 'howdy', name: 'Howdy', category: 'Food' },
      { id: 'kfc', name: 'KFC', category: 'Food' },
      { id: 'saltnpepper', name: 'Salt n Pepper', category: 'Food' },
      { id: 'jfragrances', name: 'J. Fragrances', category: 'Perfume' },
      { id: 'saeedghani', name: 'Saeed Ghani', category: 'Perfume' },
      { id: 'washroom', name: 'Washroom', category: 'Facilities' },
      { id: 'entrance', name: 'Entrance', category: 'Facilities' }
    ]
  },
  second_floor: {
    imageUrl: '/office_map.svg',
    bounds: [[0, 0], [1000, 1000]],
    nodes: [
      { id: 'fire_exit', x: 900, y: 900 },
      { id: 'hallway_1', x: 800, y: 800 },
      { id: 'door_3', x: 800, y: 600 },
      { id: 'door_4', x: 500, y: 600 },
      { id: 'door_5', x: 200, y: 600 },
      { id: 'kitchen', x: 800, y: 400 },
      { id: 'washroom_2', x: 500, y: 400 },
      { id: 'meeting_room', x: 200, y: 200 }
    ],
    links: [
      { source: 'fire_exit', target: 'hallway_1' },
      { source: 'hallway_1', target: 'door_3' },
      { source: 'door_3', target: 'door_4' },
      { source: 'door_4', target: 'door_5' },
      { source: 'door_3', target: 'kitchen' },
      { source: 'door_4', target: 'washroom_2' },
      { source: 'door_5', target: 'meeting_room' }
    ],
    locations: [
      { id: 'meeting_room', name: 'Meeting Room', category: 'Meeting Rooms' },
      { id: 'kitchen', name: 'Kitchen', category: 'Facilities' },
      { id: 'washroom_2', name: 'Washroom (2nd Floor)', category: 'Facilities' },
      { id: 'fire_exit', name: 'Fire Exit', category: 'Facilities' },
      { id: 'door_3', name: 'Employee Workspace 3', category: 'Offices' },
      { id: 'door_4', name: 'Employee Workspace 4', category: 'Offices' },
      { id: 'door_5', name: 'Employee Workspace 5', category: 'Offices' }
    ]
  }
};
