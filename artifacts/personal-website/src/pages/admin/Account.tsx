import { useChangePassword, useChangeUsername, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Account() {
  const { data: session } = useGetAdminSession();
  const queryClient = useQueryClient();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  
  const [usernameCurrentPassword, setUsernameCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });
  const [userMsg, setUserMsg] = useState({ type: "", text: "" });

  const changePassword = useChangePassword();
  const changeUsername = useChangeUsername();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setPwdMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    
    changePassword.mutate({ data: { currentPassword, newPassword } }, {
      onSuccess: () => {
        setPwdMsg({ type: "success", text: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
      },
      onError: (err: any) => {
        setPwdMsg({ type: "error", text: (err.data as { error?: string })?.error ?? "Failed to change password." });
      }
    });
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    changeUsername.mutate({ data: { currentPassword: usernameCurrentPassword, newUsername } }, {
      onSuccess: () => {
        setUserMsg({ type: "success", text: "Username changed successfully." });
        setUsernameCurrentPassword("");
        setNewUsername("");
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
      },
      onError: (err: any) => {
        setUserMsg({ type: "error", text: (err.data as { error?: string })?.error ?? "Failed to change username." });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your admin credentials.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your login password. Strong passwords recommended.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {pwdMsg.text && (
                <div className={`p-3 text-sm rounded-md border flex items-center gap-2 ${
                  pwdMsg.type === "success" 
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}>
                  {pwdMsg.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                  {pwdMsg.text}
                </div>
              )}
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Username</CardTitle>
            <CardDescription>Current username: <strong>{session?.username}</strong></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              {userMsg.text && (
                <div className={`p-3 text-sm rounded-md border flex items-center gap-2 ${
                  userMsg.type === "success" 
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}>
                  {userMsg.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                  {userMsg.text}
                </div>
              )}
              <div className="space-y-2">
                <Label>New Username</Label>
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} required minLength={3} />
              </div>
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={usernameCurrentPassword} onChange={e => setUsernameCurrentPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={changeUsername.isPending}>
                {changeUsername.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Username
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
