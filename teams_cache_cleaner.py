import os
import shutil
import subprocess
import tkinter as tk
from tkinter import messagebox, ttk
import threading
import time
import sys

class TeamsCacheCleaner:
    def __init__(self, root):
        self.root = root
        self.root.title("Teams Cache Cleaner")
        self.root.geometry("400x350")
        self.root.resizable(False, False)
        
        # Set icon if running as exe (using base64 would be an alternative)
        try:
            self.root.iconbitmap(default="appicon.ico")
        except:
            pass  # No icon available, continue without it
        
        # Configure style for a modern look
        self.style = ttk.Style()
        self.style.configure("TButton", font=("Segoe UI", 10))
        self.style.configure("TLabel", font=("Segoe UI", 10))
        self.style.configure("Header.TLabel", font=("Segoe UI", 12, "bold"))
        
        # Main frame
        main_frame = ttk.Frame(root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_label = ttk.Label(main_frame, 
                                text="Microsoft Teams Cache Cleaner", 
                                style="Header.TLabel")
        header_label.pack(pady=(0, 10))
        
        description = "This utility clears the Microsoft Teams cache folders to help resolve common issues like:\n\n• Sign-in problems\n• Messages not sending\n• Calls or meetings not connecting\n• Interface display problems\n• General performance issues"
        self.desc_label = ttk.Label(main_frame, text=description, wraplength=350, justify=tk.LEFT)
        self.desc_label.pack(pady=(0, 15), fill=tk.X)
        
        # Progress components
        self.progress_frame = ttk.Frame(main_frame)
        self.progress_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.progress = ttk.Progressbar(self.progress_frame, orient=tk.HORIZONTAL, 
                                       length=360, mode='determinate')
        self.progress.pack(pady=(0, 5), fill=tk.X)
        
        self.status_label = ttk.Label(self.progress_frame, text="Ready")
        self.status_label.pack(anchor=tk.W)
        
        # Action buttons
        self.btn_frame = ttk.Frame(main_frame)
        self.btn_frame.pack(pady=10)
        
        self.clean_btn = ttk.Button(self.btn_frame, text="Clean Teams Cache", 
                                   command=self.start_cleaning, width=20)
        self.clean_btn.pack(side=tk.LEFT, padx=5)
        
        self.cancel_btn = ttk.Button(self.btn_frame, text="Exit", 
                                    command=root.destroy, width=10)
        self.cancel_btn.pack(side=tk.LEFT, padx=5)
        
        # Footer text
        footer_text = "Note: Teams will be closed during the cleaning process."
        footer_label = ttk.Label(main_frame, text=footer_text, font=("Segoe UI", 9))
        footer_label.pack(pady=(20, 0), anchor=tk.W)
        
        # Set up cache path
        self.teams_cache_path = os.path.join(
            os.environ['USERPROFILE'], 
            'AppData', 'Local', 'Packages', 'MSTeams_8wekyb3d8bbwe'
        )
        
        # Define cache folders to clean
        self.cache_folders = [
            os.path.join(self.teams_cache_path, 'LocalCache'),
            os.path.join(self.teams_cache_path, 'LocalState', 'cache'),
            os.path.join(self.teams_cache_path, 'LocalState', 'Application Cache'),
            os.path.join(self.teams_cache_path, 'LocalState', 'GPUCache'),
            os.path.join(self.teams_cache_path, 'LocalState', 'IndexedDB')
        ]
        
        # Check for blob storage folders
        self.blob_storage_path = os.path.join(self.teams_cache_path, 'LocalState')
    
    def update_status(self, message, progress_value=None):
        """Update the status message and progress bar"""
        self.status_label.config(text=message)
        if progress_value is not None:
            self.progress['value'] = progress_value
        self.root.update_idletasks()
    
    def close_teams(self):
        """Attempt to close Teams application if running"""
        self.update_status("Checking if Teams is running...", 10)
        
        try:
            # Using subprocess instead of psutil to avoid extra dependencies
            if sys.platform == 'win32':
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                subprocess.call('taskkill /F /IM Teams.exe', 
                               startupinfo=si, 
                               stderr=subprocess.DEVNULL, 
                               stdout=subprocess.DEVNULL)
                time.sleep(2)  # Give Teams time to close
                return True
        except Exception as e:
            self.update_status(f"Note: Could not close Teams. {str(e)}")
            return False
        
        return True
    
    def clear_folder(self, folder_path):
        """Clear contents of a folder and recreate it"""
        if os.path.exists(folder_path):
            try:
                shutil.rmtree(folder_path)
                os.makedirs(folder_path, exist_ok=True)
                return True
            except Exception as e:
                print(f"Error clearing {folder_path}: {str(e)}")
                return False
        return True  # Folder doesn't exist, so no need to clear
    
    def clean_cache(self):
        """Perform the cache cleaning operation"""
        # Check if Teams cache exists
        if not os.path.exists(self.teams_cache_path):
            self.update_status("Teams installation not found.", 100)
            messagebox.showinfo("Not Found", 
                               "Microsoft Teams installation was not found on this computer.")
            self.clean_btn.config(state=tk.NORMAL)
            return
        
        # Close Teams first
        self.close_teams()
        
        total_steps = len(self.cache_folders) + 1  # +1 for blob storage
        current_step = 1
        
        # Clear regular cache folders
        for folder in self.cache_folders:
            folder_name = os.path.basename(folder)
            self.update_status(f"Clearing {folder_name}...", 
                              int((current_step / total_steps) * 100))
            self.clear_folder(folder)
            current_step += 1
        
        # Clear blob storage folders (if any)
        self.update_status("Clearing blob storage...", 90)
        if os.path.exists(self.blob_storage_path):
            for item in os.listdir(self.blob_storage_path):
                if "blob_storage" in item:
                    blob_path = os.path.join(self.blob_storage_path, item)
                    if os.path.isdir(blob_path):
                        self.clear_folder(blob_path)
        
        # All done
        self.update_status("Cache cleared successfully!", 100)
        messagebox.showinfo("Complete", 
                           "Teams cache has been successfully cleared.\n\n"
                           "You can now restart Teams and sign in again.")
        
        # Re-enable the button
        self.clean_btn.config(state=tk.NORMAL)
    
    def start_cleaning(self):
        """Start the cleaning process in a separate thread"""
        self.clean_btn.config(state=tk.DISABLED)
        self.update_status("Starting...", 0)
        
        # Run in a separate thread to keep UI responsive
        threading.Thread(target=self.clean_cache, daemon=True).start()


if __name__ == "__main__":
    root = tk.Tk()
    app = TeamsCacheCleaner(root)
    root.mainloop()