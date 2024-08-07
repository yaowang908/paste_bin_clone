'use client';

import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";
import { parseExpiration } from "@/utils/parseExpiration";
import TextArea from "@/components/TextArea";
import HighlightedTextArea from "@/components/HightlightedTextArea";
import { useMutation } from "@tanstack/react-query";

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
      <form className="max-w-sm mx-auto">
        <label htmlFor="expirationTime" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select an option</label>
        <select
          id="expirationTime"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          <option value="10m">10 minutes</option>
          <option value="1h">1 hour</option>
          <option value="1d">1 day</option>
        </select>
      </form>
      <button
        className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
        onClick={handleSubmit}
      >
        Submit
      </button>
    </div>
  )
}

export default Home;