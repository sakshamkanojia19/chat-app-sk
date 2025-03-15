
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { MessageSquare, Users, UserPlus, Shield } from 'lucide-react';

const Index = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <MessageSquare className="w-12 h-12 text-chat-primary" />,
      title: 'Real-time Messaging',
      description: 'Exchange messages instantly with friends and colleagues with no delay.'
    },
    {
      icon: <Users className="w-12 h-12 text-chat-primary" />,
      title: 'Group Conversations',
      description: 'Create groups for team projects, events or just hanging out with friends.'
    },
    {
      icon: <UserPlus className="w-12 h-12 text-chat-primary" />,
      title: 'Friend Requests',
      description: 'Grow your network by connecting with new people through our friend system.'
    },
    {
      icon: <Shield className="w-12 h-12 text-chat-primary" />,
      title: 'Secure Communication',
      description: 'Your conversations are private and protected with end-to-end encryption.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-chat-dark mb-6 leading-tight balance-text">
              Connect and Communicate with Elegance
            </h1>
            <p className="text-xl text-gray-600 mb-10 balance-text">
              Experience seamless, real-time messaging with a clean, intuitive interface.
              FlowChat brings people together through beautiful design.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {isAuthenticated ? (
                <Link 
                  to="/dashboard" 
                  className="btn-primary text-lg px-8 py-4"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    to="/signup" 
                    className="btn-primary text-lg px-8 py-4"
                  >
                    Get Started
                  </Link>
                  <Link 
                    to="/login" 
                    className="btn-secondary text-lg px-8 py-4"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-20 rounded-xl overflow-hidden shadow-soft"
          >
            <img 
              src="https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="FlowChat Interface Preview" 
              className="w-full h-auto rounded-xl"
            />
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-chat-light">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-chat-dark mb-4 balance-text">
              Crafted for Meaningful Connections
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Features that enhance your communication experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-8 rounded-2xl"
              >
                <div className="mb-5">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-chat-dark mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 bg-white">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600">
            &copy; {new Date().getFullYear()} FlowChat. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
