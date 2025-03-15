import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || localStorage.getItem('userAvatar') || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedAvatar = localStorage.getItem('userAvatar');
    if (storedAvatar) {
      setAvatar(storedAvatar);
    }
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();


    localStorage.setItem('userAvatar', avatar);

    updateUser({ name, email, avatar });
    setIsEditing(false);

    toast({
      title: 'Profile updated',
      description: 'Your profile has been updated successfully',
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newAvatar = reader.result as string;
        setAvatar(newAvatar);
        localStorage.setItem('userAvatar', newAvatar); // Persist avatar to localStorage
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-chat-light">
      <Navbar />

      <main className="pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card p-8"
          >
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile picture section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <img
                    src={avatar || 'https://cdn.iconscout.com/icon/free/png-512/free-avatar-icon-download-in-svg-png-gif-file-formats--human-man-profile-auto-user-google-material-vol-3-pack-interface-icons-30483.png?f=webp&w=256'}
                    alt={user?.name || 'User'}
                    className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md"
                  />
                  {isEditing && (
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-8 h-8 text-white" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary py-2"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Profile info section */}
              <div className="flex-grow">
                <h1 className="text-2xl font-bold text-chat-dark mb-6">
                  {isEditing ? 'Edit Profile' : 'Your Profile'}
                </h1>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="form-label">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="subtle-input pl-10 w-full"
                        placeholder="Your name"
                        disabled={!isEditing}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="subtle-input pl-10 w-full"
                        placeholder="Your email"
                        disabled={!isEditing}
                        required
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center justify-end space-x-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setName(user?.name || '');
                          setEmail(user?.email || '');
                          setAvatar(user?.avatar || localStorage.getItem('userAvatar') || '');
                        }}
                        className="btn-secondary py-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary py-2 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
