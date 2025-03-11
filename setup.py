from setuptools import setup
import sys
from cx_Freeze import setup, Executable

# Dependencies are automatically detected, but might need fine-tuning.
build_exe_options = {
    "packages": ["os", "tkinter"],
    "excludes": ["unittest", "email", "html", "http", "urllib", 
                "xml", "pydoc_data", "argparse", "doctest", "pdb", 
                "pickle", "pytz", "zipfile", "sqlite3", "pytest"],
    "include_files": ["README.md", "LICENSE"],
}

# base="Win32GUI" should be used only for Windows GUI app
base = "Win32GUI" if sys.platform == "win32" else None

setup(
    name="TeamsCacheCleaner",
    version="1.0.0",
    description="Microsoft Teams Cache Cleaner Utility",
    options={"build_exe": build_exe_options},
    executables=[
        Executable(
            "teams_cache_cleaner.py", 
            base=base,
            target_name="TeamsCacheCleaner.exe",
            icon="appicon.ico"  # Add your own icon file
        )
    ],
)