# the letters manager grew into the content manager: this starts it (tools/content.py).
import os, runpy
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content.py'), run_name='__main__')
