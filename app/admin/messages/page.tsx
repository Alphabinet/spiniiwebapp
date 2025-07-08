'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig'; // Adjust this import path if needed
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Inbox, Loader2, Mail } from 'lucide-react';

// Define the structure of a message document
interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: Timestamp;
}

const MessagesPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const messagesCollectionRef = collection(db, 'contactMessages');
    // Query to order messages by timestamp in descending order (newest first)
    const q = query(messagesCollectionRef, orderBy('timestamp', 'desc'));

    // Set up a real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: Message[] = [];
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messagesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages: ", error);
      setLoading(false); // Stop loading even if there's an error
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  // Helper to format the timestamp
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'No date';
    return format(timestamp.toDate(), 'PPP p'); // e.g., Jun 21, 2024, 4:30 PM
  };

  return (
    <Card className="w-full border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-indigo-600" />
            <CardTitle className="text-2xl font-bold text-gray-800">Contact Messages</CardTitle>
        </div>
        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
          {messages.length} Total
        </Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 gap-4">
             <Mail className="h-12 w-12 text-gray-400" />
            <h3 className="text-xl font-semibold">No Messages Yet</h3>
            <p>New messages from your contact form will appear here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow>
                  <TableHead className="w-[200px] font-semibold text-gray-700">Sender</TableHead>
                  <TableHead className="font-semibold text-gray-700">Message</TableHead>
                  <TableHead className="w-[220px] text-right font-semibold text-gray-700">Date Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium text-gray-800">{msg.name}</div>
                      <a href={`mailto:${msg.email}`} className="text-sm text-indigo-600 hover:underline">
                        {msg.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-gray-600 whitespace-pre-wrap py-4">{msg.message}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500">{formatDate(msg.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagesPage;
