'use client';

import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";
import { parseExpiration } from "@/utils/parseExpiration";
import TextArea from "@/components/TextArea";
import HighlightedTextArea from "@/components/HightlightedTextArea";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export interface Paste {
  id: string;
  content: string;
  expirationDate: number;
  token: string;
}

const createPaste = async (paste: Paste) => {
  const response = await fetch('/api/pastes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paste),
  });

  if (!response.ok) {
    throw new Error('Failed to create paste');
  }

  return response.json();
};

const Home: React.FC = () => {
  const [content, setContent] = useState('');
  const [expiration, setExpiration] = useState('10m');
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: createPaste,
    onSuccess: (data) => {
      localStorage.setItem('pasteToken', data.token);
      router.push(`/paste/${data.id}?token=${data.token}`);
    },
  });

  const handleSubmit = async () => {
    const token = uuidv4();
    const pasteId = uuidv4();
    const expirationDate = new Date().getTime() + parseExpiration(expiration);

    const paste = { id: pasteId, content, expirationDate, token };

    mutation.mutate(paste);
  };

  return (
    <div>
      <TextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={false} />
      {/* <HighlightedTextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={false} language="javascript" /> */}
      <div className="flex items-end justify-between mt-4">
        <form className="max-w-sm">
          <label htmlFor="expirationTime" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select an expiration time</label>
          <Select
            value={expiration}
            onValueChange={(value) => setExpiration(value)}
            defaultValue={undefined}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Set expiration time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10m">10 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="1d">1 day</SelectItem>
              <SelectItem value="5d">5 days</SelectItem>
              <SelectItem value="15d">15 days</SelectItem>
            </SelectContent>
          </Select>
        </form>
        <Button
          variant="outline"
          onClick={handleSubmit}
          disabled={!content}
        >
          Submit
        </Button>
      </div>
    </div>
  )
}

export default Home;