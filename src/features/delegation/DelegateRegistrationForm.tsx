import { Form, Formik } from 'formik';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { ImageOrIdenticon } from 'src/components/icons/Identicon';
import { TextField } from 'src/components/input/TextField';
import { useSignedData } from 'src/features/delegation/hooks/useSIgnedData';
import { RegisterDelegateFormValues, RegisterDelegateResponse, RegisterDelegateResponseStatus } from 'src/features/delegation/types';
import { validateRegistrationRequest } from 'src/features/delegation/validateRegistrationRequest';
import { useAccount } from 'wagmi';

// @ts-ignore TODO fix this
const initialValues: RegisterDelegateFormValues = {
  name: 'name',
  description: 'description',
  twitterUrl: 'https://x.com/celo',
  websiteUrl: '',
  interests: 'some, interests',
  verificationUrl: '',
};

export function DelegateRegistrationForm({
  defaultFormValues,
}: {
  defaultFormValues?: Partial<RegisterDelegateFormValues>;
}) {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  const signForm = useSignedData();

  const validate = async (values: RegisterDelegateFormValues, image: File | null) => {
    return await validateRegistrationRequest({
      ...values,
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
      <p>
        {/* TODO rephrase */}
        Your delegate registration has been submitted. You can track the status of your pull request
        <Link href={pullRequestUrl}>here</Link>
      </p>
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

        const signature = await signForm(values);
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
            const response = await httpResponse.json() as RegisterDelegateResponse;

            if (response.status === RegisterDelegateResponseStatus.Success) {
              setPullRequestUrl(response.pullRequestUrl);
            } else {
              // Display error
            }
          } else {
            // TODO useState for form submission error
          }
        } catch (err) {
          // TODO useState for form submission error
        }

        setIsSubmitting(false);
      }}
      validate={(values) => validate(values, imageFile)}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ errors }) => (
        <Form className="mt-4 flex flex-1 flex-col justify-between">
          <div className={'space-y-2'}>
            <div className="relative flex flex-col space-y-1.5">
              <div className="flex justify-between">
                <label htmlFor={'address'} className="pl-0.5 text-xs font-medium">
                  Address
                </label>
              </div>
              <p>{defaultFormValues?.address}</p>
              <p className={'text-xs'}>
                Your connected wallet address is provided automatically and cannot be changed, if
                you want to use different address please raise a PR
              </p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'address'} className="pl-0.5 text-xs font-medium">
                  Name
                </label>
              </div>
              <TextField
                name="name"
                placeholder="Your name"
                defaultValue={defaultFormValues?.name}
              />
              {errors.name && <p className={'text-xs text-red-500'}>{errors.name}</p>}
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'interests'} className="pl-0.5 text-xs font-medium">
                  Interests
                </label>
              </div>
              <TextField
                name="interests"
                placeholder="Blockchain, NFTs"
                defaultValue={defaultFormValues?.interests}
              />
              {errors.interests && <p className={'text-xs text-red-500'}>{errors.interests}</p>}
              <p className={'text-xs'}>Provide a comma separated list of your interests</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'description'} className="pl-0.5 text-xs font-medium">
                  Description
                </label>
              </div>
              <TextField
                name="description"
                placeholder="Your description"
                defaultValue={defaultFormValues?.description}
              />
              {errors.description && <p className={'text-xs text-red-500'}>{errors.description}</p>}
              <p className={'text-xs'}>Provide a short description of yourself</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'twitterUrl'} className="pl-0.5 text-xs font-medium">
                  Twitter
                </label>
              </div>
              <TextField
                name="twitterUrl"
                placeholder="https://x.com/celo"
                defaultValue={defaultFormValues?.twitterUrl}
              />
              {errors.twitterUrl && <p className={'text-xs text-red-500'}>{errors.twitterUrl}</p>}
              <p className={'text-xs'}>Provide a link to your X (Twitter) profile</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'websiteUrl'} className="pl-0.5 text-xs font-medium">
                  Website
                </label>
              </div>
              <TextField
                name="websiteUrl"
                placeholder="https://celo.org/"
                defaultValue={defaultFormValues?.websiteUrl}
              />
              {errors.websiteUrl && <p className={'text-xs text-red-500'}>{errors.websiteUrl}</p>}
              <p className={'text-xs'}>Provide a link to your website</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'verificationUrl'} className="pl-0.5 text-xs font-medium">
                  Verification Link
                </label>
              </div>
              <TextField
                name="verificationUrl"
                placeholder="https://celo.org/"
                defaultValue={defaultFormValues?.verificationUrl}
              />
              {errors.verificationUrl && (
                <p className={'text-xs text-red-500'}>{errors.verificationUrl}</p>
              )}
              <p className={'text-xs'}>TODO add a descriptive text on why is it needed</p>
            </div>
            <div className="relative flex flex-col">
              <div className="flex justify-between">
                <label htmlFor={'websiteUrl'} className="pl-0.5 text-xs font-medium">
                  Image
                </label>
              </div>
              <input type="file" name="image" onChange={handleFileChange} />
              {imageUrl && <ImageOrIdenticon imgSrc={imageUrl} address={address!} size={90} />}
              {errors.image! && <p className={'text-xs text-red-500'}>{errors.image!}</p>}
              <p className={'text-xs'}>Provide an image to use as your delegate logo</p>
            </div>
          </div>
          <SolidButtonWithSpinner type="submit" isLoading={isSubmitting}>
            Register Delegatee
          </SolidButtonWithSpinner>
        </Form>
      )}
    </Formik>
  );
}
