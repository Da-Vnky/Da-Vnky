#!/usr/bin/env python3
"""
bee-model.py — puts Mel's BeeLLM (or any tiny model like it) on the site, for the bee in the front garden.

The site can't serve .gguf files (the server only hands out pictures, sounds, pages, code, .json and .txt),
so this reads the model and writes it out as content/bee/beellm.json, which sky/bee.js runs right there in
each visitor's browser. Nothing is sent anywhere.

    python tools/bee-model.py                       finds Mel's bee in your Ollama folder and writes it
    python tools/bee-model.py path\\to\\model.gguf    a .gguf file of your own
    python tools/bee-model.py hf.co/someone/Model:tag    another model you've pulled into Ollama

It only takes small models whose numbers are stored plainly (F32 or F16, not the squashed "Q4", "Q8" kinds):
a browser has to do every sum itself, so it's for bees, not for big models. It says so if it can't.
No extra Python packages needed.
"""

import base64, json, os, struct, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'content', 'bee', 'beellm.json')
MEL = 'hf.co/schizophyllume/BeeLLM:BeeLLM-42P-Chaos.gguf'      # (the bee Mel made)
BIGGEST = 4_000_000                                             # numbers; past this a browser would struggle


def ollama_models():
    """where Ollama keeps its models (OLLAMA_MODELS if it's been moved)."""
    return os.environ.get('OLLAMA_MODELS') or os.path.join(os.path.expanduser('~'), '.ollama', 'models')


def from_ollama(name):
    """a model's name in Ollama (host/owner/model:tag) → its .gguf file in Ollama's folder."""
    if ':' in name.split('/')[-1]:
        name, tag = name.rsplit(':', 1)
    else:
        tag = 'latest'
    parts = name.split('/')
    if len(parts) == 1:
        parts = ['registry.ollama.ai', 'library'] + parts
    elif len(parts) == 2:
        parts = ['registry.ollama.ai'] + parts
    manifest = os.path.join(ollama_models(), 'manifests', *parts, tag)
    if not os.path.isfile(manifest):
        sys.exit("couldn't find %s in Ollama (looked for %s).\n"
                 "try 'ollama list' to see the exact name, or give the path to a .gguf file." % (name + ':' + tag, manifest))
    with open(manifest, encoding='utf-8') as f:
        layers = json.load(f).get('layers', [])
    for layer in layers:
        if layer.get('mediaType') == 'application/vnd.ollama.image.model':
            blob = os.path.join(ollama_models(), 'blobs', layer['digest'].replace(':', '-'))
            if os.path.isfile(blob):
                return blob
    sys.exit("Ollama knows %s but its model file isn't in %s." % (name, os.path.join(ollama_models(), 'blobs')))


def read_gguf(path):
    """the model's settings and its numbers. (the .gguf layout: a header, the settings, the list of
    tensors, then the numbers themselves, each tensor starting on a 32-byte boundary.)"""
    with open(path, 'rb') as f:
        d = f.read()
    if d[:4] != b'GGUF':
        sys.exit('%s is not a .gguf model file.' % path)
    o = [4]

    def rd(fmt):
        v = struct.unpack_from('<' + fmt, d, o[0])
        o[0] += struct.calcsize(fmt)
        return v[0]

    def text():
        n = rd('Q')
        v = d[o[0]:o[0] + n].decode('utf-8', 'replace')
        o[0] += n
        return v

    kinds = {0: 'B', 1: 'b', 2: 'H', 3: 'h', 4: 'I', 5: 'i', 6: 'f', 7: '?', 10: 'Q', 11: 'q', 12: 'd'}

    def value(t):
        if t == 8:
            return text()
        if t == 9:
            et, n = rd('I'), rd('Q')
            return [value(et) for _ in range(n)]
        return rd(kinds[t])

    version = rd('I')
    if version < 2:
        sys.exit('this .gguf is too old (version %d).' % version)
    n_tensors, n_keys = rd('Q'), rd('Q')
    meta = {}
    for _ in range(n_keys):
        k = text()
        meta[k] = value(rd('I'))
    infos = []
    for _ in range(n_tensors):
        name = text()
        dims = [rd('Q') for _ in range(rd('I'))]
        infos.append((name, dims, rd('I'), rd('Q')))
    align = meta.get('general.alignment', 32)
    start = (o[0] + align - 1) // align * align
    total = sum(_count(dims) for _, dims, _, _ in infos)
    if total > BIGGEST:
        sys.exit('this model has %d numbers in it: far too many for a web page (the bee has ~24 thousand).' % total)
    tensors = {}
    for name, dims, kind, off in infos:
        n = _count(dims)
        at = start + off
        if kind == 0:                                      # F32
            raw = d[at:at + 4 * n]
        elif kind == 1:                                    # F16: widened to F32 for the browser
            halves = struct.unpack_from('<%de' % n, d, at)
            raw = struct.pack('<%df' % n, *halves)
        else:
            sys.exit("tensor %s is stored squashed (type %d). only plain F32 or F16 models can go in the browser:\n"
                     "ask for an F16/F32 export of the model." % (name, kind))
        # gguf lists sizes fastest-first: [columns, rows]
        cols = dims[0]
        rows = n // cols if cols else 0
        tensors[name] = {'rows': rows, 'cols': cols, 'data': base64.b64encode(raw).decode('ascii')}
    return meta, tensors


def _count(dims):
    n = 1
    for x in dims:
        n *= x
    return n


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else MEL
    path = arg if os.path.isfile(arg) else from_ollama(arg)
    meta, tensors = read_gguf(path)
    arch = meta.get('general.architecture', '')
    if arch != 'llama':
        sys.exit("this is a '%s' model; the bee's brain (sky/bee.js) knows how to run llama-style models only." % arch)
    a = arch + '.'
    toks = meta.get('tokenizer.ggml.tokens') or []
    if not toks:
        sys.exit('the model has no word list (tokenizer) in it.')
    n_embd = meta[a + 'embedding_length']
    n_head = meta[a + 'attention.head_count']
    model = {
        'note': 'written by tools/bee-model.py from ' + os.path.basename(path) + ': run by sky/bee.js. no need to edit it.',
        'name': meta.get('general.name', ''),
        'description': meta.get('general.description', ''),
        'config': {
            'n_embd': n_embd,
            'n_layer': meta[a + 'block_count'],
            'n_ff': meta[a + 'feed_forward_length'],
            'n_head': n_head,
            'n_head_kv': meta.get(a + 'attention.head_count_kv', n_head),
            'rope_dim': meta.get(a + 'rope.dimension_count', n_embd // n_head),
            'rope_base': meta.get(a + 'rope.freq_base', 10000.0),
            'eps': meta.get(a + 'attention.layer_norm_rms_epsilon', 1e-5),
            'ctx': meta.get(a + 'context_length', 2048),
        },
        'tokens': toks,
        'types': meta.get('tokenizer.ggml.token_type') or [1] * len(toks),
        'bos': meta.get('tokenizer.ggml.bos_token_id', 1),
        'eos': meta.get('tokenizer.ggml.eos_token_id', 2),
        'tensors': tensors,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(model, f, ensure_ascii=False, separators=(',', ':'))
    numbers = sum(t['rows'] * t['cols'] for t in tensors.values())
    print('wrote %s: "%s", %d words it knows, %d numbers (%d KB).'
          % (os.path.relpath(OUT, ROOT), model['name'], len(toks), numbers, os.path.getsize(OUT) // 1024))


if __name__ == '__main__':
    main()
