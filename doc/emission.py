import bpy
from random import randint

cube     = bpy.data.objects["Cube"]
material = cube.active_material
# material = bpy.data.materials['Material']

frame_number = 0

for i in range(0, 5):
    bpy.context.scene.frame_set(frame_number)
    
    cube.location = (0, 0, 0)
    cube.keyframe_insert(data_path="location", frame=frame_number)
    
    strength = ((1 / 4) * i) * 1
    material.node_tree.nodes['Emission'].inputs['Strength'].default_value = strength
    material.node_tree.nodes['Emission'].inputs['Strength'].keyframe_insert(data_path='default_value', frame=frame_number)
    frame_number += 24
    
print ('done')