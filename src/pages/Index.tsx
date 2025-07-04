import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setProfile(data);
      }
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Mindful Task Guide</h1>
          <p className="text-xl text-muted-foreground">
            Personalized task management based on your energy and preferences
          </p>
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Please sign in to access your personalized task management experience.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Sign In / Sign Up</Link>
              </Button>
            </CardContent>
          </Card>
        ) : profile?.onboarding_completed ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome back, {profile.display_name}!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your personalized task management is ready.
              </p>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <Link to="/settings">Settings</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/tasks">Start Tasks</Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Let's personalize your task management experience with a quick onboarding.
              </p>
              <Button asChild className="w-full">
                <Link to="/onboarding">Start Onboarding</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
