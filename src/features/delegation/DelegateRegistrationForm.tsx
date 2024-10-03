import { Form, Formik } from 'formik';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { ImageOrIdenticon } from 'src/components/icons/Identicon';
import { TextField } from 'src/components/input/TextField';
import { useSignedData } from 'src/features/delegation/hooks/useSIgnedData';
import {
  RegisterDelegateFormValues,
  RegisterDelegateResponse,
  RegisterDelegateResponseStatus,
} from 'src/features/delegation/types';
import { validateRegistrationRequest } from 'src/features/delegation/validateRegistrationRequest';
import { useAccount } from 'wagmi';

const initialValues: RegisterDelegateFormValues = {
  address: '0x',
  name: '',
  description: '',
  twitterUrl: '',
  websiteUrl: '',
  interests: '',
  verificationUrl: '',
  image: null,
};

export function DelegateRegistrationForm({
  defaultFormValues,
}: {
  defaultFormValues?: Partial<RegisterDelegateFormValues>;
}) {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  const signForm = useSignedData();

  const validate = async (values: RegisterDelegateFormValues, image: File | null) => {
    return await validateRegistrationRequest({
      ...values,
      address: address!,
      image,
    });
  };

  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageUrl = useMemo(() => {
    if (imageFile && imageFile.type.startsWith('image')) {
      return URL.createObjectURL(imageFile);
    }

    return undefined;
  }, [imageFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFile(e.target.files[0]);
    }
  };

  if (pullRequestUrl) {
    return (
      <>
        <p>
          Your delegatee registration has been submitted successfully and a{' '}
          <Link className={'text-blue-500 hover:underline'} href={pullRequestUrl}>
            pull request
          </Link>{' '}
          has been created.
        </p>
        <p>It will be reviewed soon. Thank you for your interest in Celo governance.</p>
      </>
    );
  }

  return (
    <Formik<RegisterDelegateFormValues>
      initialValues={{
        ...defaultFormValues,
        ...initialValues,
      }}
      onSubmit={async (values) => {
        setIsSubmitting(true);
        setIsSigning(true);

        const signature = await signForm({
          ...values,
          address: address!
        });

        setIsSigning(false);

        const request = new FormData();

        request.append('image', imageFile as Blob);
        request.append('name', values.name);
        request.append('interests', values.interests);
        request.append('description', values.description);
        request.append('signature', signature);

        if (values.twitterUrl) {
          request.append('twitterUrl', values.twitterUrl);
        }

        if (values.websiteUrl) {
          request.append('websiteUrl', values.websiteUrl);
        }

        request.append('verificationUrl', values.verificationUrl);
        request.append('address', address!);

        try {
          const httpResponse = await fetch('/delegate/api/register', {
            method: 'POST',
            body: request,
          });

          if (httpResponse.ok) {
            const response = (await httpResponse.json()) as RegisterDelegateResponse;

            if (response.status === RegisterDelegateResponseStatus.Success) {
              setPullRequestUrl(response.pullRequestUrl);
            } else {
              toast.error(response.message);
            }
          } else {
            toast.error('Error while registering delegatee');
          }
        } catch (err) {
          toast.error(`Error while registering delegatee: ${(err as Error).message}`);
        }

        setIsSubmitting(false);
      }}
      validate={(values) => validate(values, imageFile)}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ errors }) => (
        <Form className="mt-4 flex flex-1 flex-col justify-between">
          <div className={'space-y-3'}>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'address'} className="text-xs font-semibold">
                Address
              </label>
              <p className={'font-bold'}>{defaultFormValues?.address}</p>
              <p className={'text-xs'}>
                Your connected wallet address is provided automatically and cannot be changed. If
                you want to use different address, open a pull request manually on{' '}
                <Link href="https://github.com/celo-org/celo-mondo">Github</Link>.
              </p>
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'address'} className="text-xs font-semibold">
                Name
              </label>
              <TextField
                name="name"
                placeholder="Your name"
                defaultValue={defaultFormValues?.name}
              />
              {errors.name && <p className={'text-xs text-red-500'}>{errors.name}</p>}
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'interests'} className="text-xs font-semibold">
                Interests
              </label>
              <TextField
                name="interests"
                placeholder="Blockchain, NFTs"
                defaultValue={defaultFormValues?.interests}
              />
              {errors.interests && <p className={'text-xs text-red-500'}>{errors.interests}</p>}
              <p className={'text-xs'}>
                Provide a comma separated list of your interests, at least one is required.
              </p>
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'description'} className="text-xs font-semibold">
                Description
              </label>
              <TextField
                name="description"
                placeholder="Your description"
                defaultValue={defaultFormValues?.description}
              />
              {errors.description && <p className={'text-xs text-red-500'}>{errors.description}</p>}
              <p className={'text-xs'}>Provide a short description of yourself.</p>
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'twitterUrl'} className="text-xs font-semibold">
                Twitter
              </label>
              <TextField
                name="twitterUrl"
                placeholder="https://x.com/celo"
                defaultValue={defaultFormValues?.twitterUrl}
              />
              {errors.twitterUrl && <p className={'text-xs text-red-500'}>{errors.twitterUrl}</p>}
              <p className={'text-xs'}>Provide a link to your X (formerly Twitter) profile.</p>
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'websiteUrl'} className="text-xs font-semibold">
                Website
              </label>
              <TextField
                name="websiteUrl"
                placeholder="https://celo.org/"
                defaultValue={defaultFormValues?.websiteUrl}
              />
              {errors.websiteUrl && <p className={'text-xs text-red-500'}>{errors.websiteUrl}</p>}
              <p className={'text-xs'}>Provide a link to your website.</p>
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'verificationUrl'} className="text-xs font-semibold">
                Verification Link
              </label>
              <TextField
                name="verificationUrl"
                placeholder="https://celo.org/"
                defaultValue={defaultFormValues?.verificationUrl}
              />
              {errors.verificationUrl && (
                <p className={'text-xs text-red-500'}>{errors.verificationUrl}</p>
              )}
              <p className={'text-xs'}>
                Provide a URL to proof authenticity of your delegatee registration, it can be a link
                to a tweet, a forum post etc.
              </p>
            </div>
            <div className={'flex flex-col space-y-0.5'}>
              <label htmlFor={'websiteUrl'} className="text-xs font-semibold">
                Image
              </label>
              <div className={'flex items-center'}>
                {imageUrl && (
                  <div className="mr-5">
                    <ImageOrIdenticon imgSrc={imageUrl} address={address!} size={90} />
                  </div>
                )}
                <input type="file" name="image" onChange={handleFileChange} />
              </div>
              {errors.image! && <p className={'text-xs text-red-500'}>{errors.image!}</p>}
              <p className={'text-xs'}>Provide an image to use as your delegate logo.</p>
            </div>
            <div className="space-y-2">
              <SolidButtonWithSpinner
                type="submit"
                isLoading={isSubmitting}
                loadingText={isSigning ? 'Signing' : 'Submitting'}
              >
                Sign and submit
              </SolidButtonWithSpinner>
              <p className={'text-xs'}>
                Upon submission, you will be first asked to sign a message with your wallet.
              </p>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}
