# Builds the GG Gains 3D figure from Z-Anatomy (CC BY-SA 4.0; models from BodyParts3D, CC BY-SA 2.1 JP).
# Surface muscles are grouped into the app's 17 muscle groups; head, hands and feet (bones + small muscles)
# become one dark "body" mesh. Each group is decimated so the whole figure stays light enough for phones.
import bpy, bmesh, json, sys, os, re
OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
G = {
  'chest': ['Clavicular head of pectoralis major muscle', 'Sternocostal head of pectoralis major muscle', '(Abdominal part of pectoralis major muscle)'],
  'shoulders': ['Clavicular part of deltoid muscle', 'Acromial part of deltoid muscle', 'Scapular spinal part of deltoid muscle'],
  'traps': ['Descending part of trapezius muscle', 'Transverse part of trapezius muscle', 'Ascending part of trapezius muscle', 'Levator scapulae'],
  'biceps': ['Long head of biceps brachii', 'Short head of biceps brachii', 'Brachialis muscle', 'Coracobrachialis muscle'],
  'triceps': ['Long head of triceps brachii', 'Lateral head of triceps brachii', 'Medial head of triceps brachii', 'Anconeus muscle'],
  'forearms': ['Brachioradialis muscle', 'Extensor carpi radialis longus', 'Extensor carpi radialis brevis', 'Extensor digitorum', 'Extensor digiti minimi',
               'Humeral head of extensor carpi ulnaris', 'Ulnar head of extensor carpi ulnaris', 'Flexor carpi radialis', 'Palmaris longus muscle',
               'Humeral head of flexor carpi ulnaris', 'Ulnar head of flexor carpi ulnaris', 'Humero-ulnar head of flexor digitorum superficialis',
               'Radial head of flexor digitorum superficialis', 'Superficial head of pronator teres', 'Deep head of pronator teres', 'Abductor pollicis longus',
               'Extensor pollicis brevis', 'Extensor pollicis longus', 'Flexor pollicis longus', 'Flexor digitorum profundus', 'Supinator', 'Pronator quadratus'],
  'abdominals': ['Rectus abdominis muscle', 'External abdominal oblique muscle', 'Serratus anterior muscle', 'Pyramidalis muscle'],
  'lats': ['Latissimus dorsi muscle', 'Teres major muscle'],
  'middle back': ['Rhomboid major muscle', 'Rhomboid minor muscle', 'Infraspinatus muscle', 'Teres minor muscle', 'Supraspinatus muscle'],
  'lower back': ['Iliocostalis lumborum muscle', 'Iliocostalis thoracis muscle', 'Longissimus thoracis muscle', 'Spinalis thoracis muscle', 'Multifidus lumborum muscle', 'Quadratus lumborum muscle'],
  'glutes': ['Gluteus maximus muscle', 'Gluteus medius muscle'],
  'abductors': ['Tensor fasciae latae', 'Gluteus minimus muscle'],
  'adductors': ['Adductor longus', 'Adductor magnus', 'Adductor brevis', 'Gracilis muscle', 'Pectineus muscle'],
  'quadriceps': ['Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle', 'Sartorius muscle'],
  'hamstrings': ['Long head of biceps femoris', 'Short head of biceps femoris', 'Semitendinosus muscle', 'Semimembranosus muscle'],
  'calves': ['Lateral head of gastrocnemius', 'Medial head of gastrocnemius', 'Soleus muscle', 'Tibialis anterior muscle', 'Fibularis longus muscle',
             'Fibularis brevis muscle', 'Extensor digitorum longus', 'Extensor hallucis longus', 'Plantaris muscle'],
  'neck': ['Sternocleidomastoid muscle', 'Splenius capitis muscle', 'Sternohyoid muscle', 'Omohyoid muscle', 'Scalenus anterior muscle', 'Scalenus medius muscle'],
}
BODY_MUSCLES = ['Frontalis muscle', 'Occipitalis muscle', 'Temporalis muscle', 'Superficial part of masseter', 'Orbicularis oris muscle', 'Orbital part of orbicularis oculi',
  'Palpebral part of orbicularis oculi', 'Zygomaticus major muscle', 'Zygomaticus minor muscle', 'Bucinator', 'Epicranial aponeurosis', 'Temporoparietalis muscle',
  'Nasalis muscle', 'Mentalis muscle', 'Depressor anguli oris', 'Depressor labii inferioris', 'Levator labii superioris', 'Levator nasolabialis', 'Risorius muscle',
  'Procerus muscle', 'Calcaneal tendon', 'Abductor digiti minimi of hand',
  'Abductor pollicis brevis', 'Opponens pollicis muscle', 'Dorsal interossei muscles of hand', 'Palmar aponeurosis', 'Abductor hallucis', 'Abductor digiti minimi of foot',
  'Extensor digitorum brevis', 'Extensor hallucis brevis', 'Flexor digitorum brevis', 'Plantar aponeurosis', 'Inferior extensor retinaculum of ankle',
  'Superior extensor retinaculum of ankle', 'Extensor retinaculum of wrist', 'Flexor retinaculum of wrist', 'Inguinal ligament', 'Platysma', 'Pectoralis minor muscle',
  'Subscapularis muscle', 'Iliacus muscle', 'Psoas major', 'Obturator externus']
BONE_COLS = {'Right hand', 'Left hand', 'Right foot', 'Left foot', 'Head', 'Mandible', 'Bones of hand', 'Bones of foot'}
SKIP_BONE = re.compile(r'teeth|tooth|incisor|canine|molar|ossicle|incus|malleus|stapes|hyoid|cartilage|ethmoid|sphenoid|vomer|concha|lacrimal|palatine|crista', re.I)
TARGET = {'body': 42000}
DEEP_SKIP = re.compile(r'bursa|sheath|fascia|septum|retinacul|aponeurosis|tract|ligament|linea|arch|tendon|palat|pharyn|glossus|tongue|laryn|aryten|thyro|crico|rectus muscle$|oblique muscle$|inferior oblique|superior oblique|levator palpebrae|tarsus|auricular|ossicle|stapedius|tensor tympani|diaphragm|anal|perine|levator ani|coccygeus|pubo|iliococcyg|sphincter|uvula|digastric|mylohyoid|geniohyoid|stylohyoid|pterygoid|trochlea|intercostal|transversus thoracis|levatores', re.I)
DEFAULT_TARGET = 5200
SIDE = re.compile(r'^(.*)\.([lr])$')

def base_side(name):
    m = SIDE.match(name)
    return (m.group(1), m.group(2)) if m else (name, '')

lookup = {}
for g, names in G.items():
    for n in names: lookup[n] = g
for n in BODY_MUSCLES: lookup[n] = 'body'

dg = bpy.context.evaluated_depsgraph_get()
groups = {}
missing = set(lookup)
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    b, side = base_side(o.name)
    cols = {c.name for c in o.users_collection}
    g = None
    if b in lookup and (side or '.' not in o.name) and '4: Muscular system' in cols:
        g = lookup[b]; missing.discard(b)
    elif '4: Muscular system' in cols and side and b not in lookup and len(o.data.vertices) > 60 and not DEEP_SKIP.search(b):
        g = 'body'
    elif '1: Skeletal system' in cols and len(o.data.vertices) > 60 and not SKIP_BONE.search(b) and re.search(r'rib|vertebra|sacrum|coccyx|hip bone|ilium|ischium|pubis|femur|tibia|fibula|patella|humerus|radius|ulna|scapula|clavicle|sternum', b, re.I) and not (cols & {'Bonus collection'} and len(o.data.vertices) < 100):
        g = 'body'
    elif '1: Skeletal system' in cols and side and len(o.data.vertices) > 40 and (cols & BONE_COLS or re.search(r'phalanx|metacarp|metatars|carpal|tarsal|cuneiform|cuboid|navicular|talus|calcaneus|skull|cranium|frontal bone|parietal|occipital bone|temporal bone|zygomatic|maxilla|mandible|nasal bone|scaphoid|lunate|triquetrum|pisiform|trapezi|capitate|hamate', b, re.I)) and not SKIP_BONE.search(b):
        g = 'body'
    elif '1: Skeletal system' in cols and not side and len(o.data.vertices) > 40 and re.search(r'mandible|frontal bone|occipital bone', b, re.I):
        g = 'body'
    if g: groups.setdefault(g, []).append(o)

report = {'missing': sorted(missing), 'groups': {}}
made = []
for g, objs in groups.items():
    bm = bmesh.new()
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    me = bpy.data.meshes.new(g.replace(' ', '_'))
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(g.replace(' ', '_'), me)
    bpy.context.scene.collection.objects.link(ob)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    tgt = TARGET.get(g, DEFAULT_TARGET)
    if tris > tgt:
        mod = ob.modifiers.new('dec', 'DECIMATE'); mod.ratio = tgt / tris; mod.use_collapse_triangulate = True
    for p in me.polygons: p.use_smooth = True
    report['groups'][g] = {'objects': len(objs), 'names': sorted({base_side(o.name)[0] for o in objs})[:80], 'tris_in': tris, 'target': tgt}
    made.append(ob)

for o in bpy.context.view_layer.objects: o.select_set(False)
for o in made: o.select_set(True)
bpy.context.view_layer.objects.active = made[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'body3d.glb'), export_format='GLB', use_selection=True, export_apply=True,
                          export_normals=True, export_texcoords=False, export_materials='NONE', export_colors=False, export_yup=True)
report['size'] = os.path.getsize(os.path.join(OUT, 'body3d.glb'))
json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)
print('done', report['size'])
