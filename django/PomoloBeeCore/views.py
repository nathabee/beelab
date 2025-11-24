import os
from rest_framework import viewsets, status
from django.core.files.storage import default_storage
from django.conf import settings
from django.utils import timezone
import requests
import logging
 
from rest_framework.decorators import action 
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response


from .models import Field, background_image_upload_path, svg_upload_path   
from .serializers import FieldSerializer

from .utils import BaseAPIView 
from django.db import transaction

from rest_framework.viewsets import ReadOnlyModelViewSet
 
 
from rest_framework.permissions import IsAuthenticated
from .permissions import FarmerOrReadOnlyDemo
# views.py
import os
import logging
from rest_framework import viewsets, status 
 

from .exceptions import APIError, MLUnavailableError
from PomoloBeeCore.utils import get_object_or_error
from .models import Field, Fruit, Image, Estimation, Row, Farm
from .serializers import (
    FieldSerializer, FruitSerializer, FieldLocationSerializer,
    ImageSerializer, ImageUploadSerializer, 
    EstimationSerializer,  FarmWithFieldsSerializer
)

 
 
logger = logging.getLogger(__name__)

 

# ---------- FARM ---------- 
 


class FarmViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    serializer_class = FarmWithFieldsSerializer

    def get_queryset(self):
        u = self.request.user
        qs = Farm.objects.prefetch_related('fields')
        if u.is_superuser:
            return qs
        if u.groups.filter(name='demo').exists():
            return qs.filter(is_demo_visible=True)
        return qs.filter(owner=u)

    
# ---------- FIELD + FRUIT ---------- 


class FieldViewSet(viewsets.ModelViewSet): 
    serializer_class = FieldSerializer
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]

    def get_queryset(self):
        u = self.request.user
        qs = Field.objects.select_related('farm')
        if u.is_superuser:
            return qs
        if u.groups.filter(name='demo').exists():
            return qs.filter(farm__is_demo_visible=True)
        return qs.filter(farm__owner=u)

    @action(detail=True, methods=['post'], url_path='background', parser_classes=[MultiPartParser, FormParser])
    def upload_background(self, request, pk=None):
        field = self.get_object()
        file = (request.FILES.get('background_image')
                or request.FILES.get('file')
                or request.FILES.get('image'))

        logger.info("BG upload POST keys: data=%s files=%s",
                    list(request.data.keys()), list(request.FILES.keys()))

        if not file:
            logger.warning("BG upload: missing file | user=%s field_id=%s short=%s",
                           getattr(request.user, 'id', None), field.id, field.short_name)
            return Response({"detail": "Missing file (use 'background_image')."}, status=400)

        orig_name = getattr(file, 'name', '')
        content_type = getattr(file, 'content_type', '')
        size = getattr(file, 'size', None)
        logger.info("BG upload: start | user=%s field_id=%s short=%s orig=%s type=%s size=%s",
                    getattr(request.user, 'id', None), field.id, field.short_name, orig_name, content_type, size)

        ext = os.path.splitext(orig_name)[1].lower()
        if ext not in ('.png', '.jpg', '.jpeg'):
            logger.warning("BG upload: invalid ext | user=%s field_id=%s short=%s ext=%s",
                           getattr(request.user, 'id', None), field.id, field.short_name, ext)
            return Response({"detail": "Only PNG/JPG/JPEG allowed."}, status=400)

        desired_ext = '.png' if ext == '.png' else '.jpeg'
        file.name = f"{field.short_name}{desired_ext}"

        storage = field.background_image.storage
        target_relpath = background_image_upload_path(field, file.name)
        abs_target = None
        if hasattr(storage, 'path'):
            try:
                abs_target = storage.path(target_relpath)
            except Exception:
                pass

        logger.info("BG upload: target | rel=%s abs=%s", target_relpath, abs_target)

        if storage.exists(target_relpath):
            logger.info("BG upload: deleting existing | rel=%s", target_relpath)
            storage.delete(target_relpath)

        field.background_image = file
        field.save(update_fields=['background_image'])

        saved_url = field.background_image.url
        saved_rel = field.background_image.name
        saved_abs = None
        if hasattr(storage, 'path'):
            try:
                saved_abs = storage.path(saved_rel)
            except Exception:
                pass

        logger.info("BG upload: done | user=%s field_id=%s short=%s url=%s rel=%s abs=%s",
                    getattr(request.user, 'id', None), field.id, field.short_name, saved_url, saved_rel, saved_abs)

        return Response({"background_image_url": saved_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='svg', parser_classes=[MultiPartParser, FormParser])
    def upload_svg(self, request, pk=None):
        field = self.get_object()
        file = request.FILES.get('svg_map') or request.FILES.get('file')

        logger.info("SVG upload POST keys: data=%s files=%s",
                    list(request.data.keys()), list(request.FILES.keys()))

        if not file:
            return Response({"detail": "Missing file (use 'svg_map')."}, status=400)

        ext = os.path.splitext(file.name)[1].lower()
        if ext != '.svg':
            return Response({"detail": "Only .svg allowed."}, status=400)

        file.name = f"{field.short_name}_map.svg"

        storage = field.svg_map.storage
        target_relpath = svg_upload_path(field, file.name)
        if storage.exists(target_relpath):
            logger.info("SVG upload: deleting existing | rel=%s", target_relpath)
            storage.delete(target_relpath)

        field.svg_map = file
        field.save(update_fields=['svg_map'])

        return Response({"svg_map_url": field.svg_map.url}, status=status.HTTP_200_OK)


# ------------FRUIT --------------

class FruitViewSet(ReadOnlyModelViewSet):
    queryset = Fruit.objects.all()
    serializer_class = FruitSerializer
    permission_classes = [IsAuthenticated]


# ---------- LOCATION ---------- 
class LocationListView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def get(self, request): 
 
        u = request.user
        if u.is_superuser:
            fields = Field.objects.prefetch_related('rows__fruit').all()
        elif u.groups.filter(name='demo').exists():
            fields = Field.objects.filter(farm__is_demo_visible=True).prefetch_related('rows__fruit')
        else:
            fields = Field.objects.filter(farm__owner=u).prefetch_related('rows__fruit')

        if not fields.exists():
            raise APIError("NO_DATA", "No field and row data available.", status.HTTP_404_NOT_FOUND)
        serializer = FieldLocationSerializer(fields, many=True, context={'request': request})
        return self.success({"locations": serializer.data})


# ---------- IMAGE ---------- 


class ImageDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def get(self, request, image_id):
        image = get_object_or_error(Image, id=image_id)

        u = request.user
        if u.is_superuser:
            pass
        elif u.groups.filter(name='demo').exists():
            if not image.row.field.farm.is_demo_visible:
                raise APIError("FORBIDDEN", "Not allowed", status.HTTP_403_FORBIDDEN)
        else:
            if image.row.field.farm.owner_id != u.id:
                raise APIError("FORBIDDEN", "Not allowed", status.HTTP_403_FORBIDDEN)

        serializer = ImageSerializer(image, context={'request': request})
        return self.success(serializer.data)




class ImageDeleteView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def delete(self, request, image_id):
        image = get_object_or_error(Image, id=image_id)
        if (not request.user.is_superuser
            and image.row.field.farm.owner_id != request.user.id):
            raise APIError("FORBIDDEN", "Not allowed", status.HTTP_403_FORBIDDEN)
        warning = None

        try:
            if image.image_file and default_storage.exists(image.image_file.name):
                default_storage.delete(image.image_file.name)
        except Exception as e:
            warning = f"Could not delete file: {e}"
            print(f"Warning: {warning}")

        image.delete()

        response_data = {"message": "Image deleted successfully."}
        if warning:
            response_data["warning"] = warning

        return self.success(response_data)
    

class ImageListView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def get(self, request):
        u = request.user
        if u.is_superuser:
            qs = Image.objects.all()
        elif u.groups.filter(name='demo').exists():
            qs = Image.objects.filter(row__field__farm__is_demo_visible=True)
        else:
            qs = Image.objects.filter(row__field__farm__owner=u)

        qs = qs.order_by('-upload_date')
        ...



class ImageView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def post(self, request):
        serializer = ImageUploadSerializer(data=request.data)
        if serializer.is_valid():
            image_file = serializer.validated_data['image']
            row_id = serializer.validated_data['row_id']
            date = serializer.validated_data['date']
            # Save original name (optional, for dedup or trace)
            user_fruit_plant  = serializer.validated_data.get('user_fruit_plant', None)
            original_filename = image_file.name
            xy_location = serializer.validated_data.get('xy_location', None)


            existing = Image.objects.filter(
                original_filename=original_filename,
                row_id=row_id,
                date=date
            ).first()

            if existing:
                return self.success({"image_id": existing.id, "message": "Already uploaded."})




            # Save temp with any name first
            file_path = default_storage.save(f'images/temp_{original_filename}', image_file)

            # Create the Image record
            image = Image.objects.create(
                image_file=file_path,
                row_id=row_id,
                xy_location=xy_location,
                user_fruit_plant=user_fruit_plant,
                date=date,
                upload_date=timezone.now().date(),
                processed=False,
                status=Image.ImageStatus.PROCESSING,
                original_filename=original_filename
            )

            # Compute new desired name: image-{id}.jpg
            ext = os.path.splitext(original_filename)[1]  # e.g., .jpg
            new_filename = f"images/image-{image.id}{ext}"
            new_full_path = os.path.join(settings.MEDIA_ROOT, new_filename)

            # Rename the file on disk
            os.rename(os.path.join(settings.MEDIA_ROOT, file_path), new_full_path)

            # Update the model to point to the new name
            image.image_file.name = new_filename 
            image.save()

            image_url = image.image_file.url 
            payload = {
                "image_url": image_url,
                "image_id": image.id
            }

            try:
                response = requests.post(f"{settings.ML_API_URL}/process-image", json=payload, timeout=5)
                if response.status_code == 200:
                    return self.success({
                        "image_id": image.id,
                        "message": "Image uploaded successfully and queued for processing."
                    }, status.HTTP_201_CREATED)
                else:
                    raise MLUnavailableError(detail="ML call failed", image_id=image.id)

            except requests.RequestException as e:
                raise MLUnavailableError(detail=str(e), image_id=image.id)

        logger.warning("ImageUploadSerializer failed: %s", serializer.errors)
        raise APIError("INVALID_INPUT", serializer.errors, status.HTTP_400_BAD_REQUEST)


class RetryProcessingView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def post(self, request):
        image_id = request.data.get("image_id")
        image = get_object_or_error(Image, id=image_id)

        if image.processed:
            raise APIError("ALREADY_PROCESSED", "Image already processed successfully.", status.HTTP_409_CONFLICT)

        image_url = image.image_file.url 
        payload = {
            "image_url": image_url,
            "image_id": image.id
        }


        try:
            response = requests.post(f"{settings.ML_API_URL}/process-image", json=payload, timeout=5)
            if response.status_code == 200:
                return self.success({"message": "Image processing retry has been requested."})
            else:
                raise APIError("ML_RETRY_FAILED", "Retry failed. ML service issue.", status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.RequestException as e:
            raise MLUnavailableError(detail=f"ML retry failed: {str(e)}", image_id=image.id)


# ---------- ML VERSION ----------
class MLVersionView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def get(self, request):
        try:
            response = requests.get(f"{settings.ML_API_URL}/version", timeout=5)
            if response.status_code == 200:
                return self.success(response.json().get("data", {}))
            else:
                raise MLUnavailableError(detail="ML service returned error")
        except requests.RequestException as e:
            raise MLUnavailableError(detail=f"ML service unavailable: {str(e)}")



# ---------- ESTIMATION ----------  

class FieldEstimationListView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def get(self, request, field_id):
        base = Estimation.objects.filter(row__field_id=field_id)
        u = request.user
        if u.is_superuser:
            estimations = base
        elif u.groups.filter(name='demo').exists():
            estimations = base.filter(row__field__farm__is_demo_visible=True)
        else:
            estimations = base.filter(row__field__farm__owner=u)

        estimations = estimations.order_by('-timestamp')
        if not estimations.exists():
            raise APIError("404_NOT_FOUND", "No estimation found.", status.HTTP_404_NOT_FOUND)
        return self.success({"estimations": EstimationSerializer(estimations, many=True).data})



class EstimationView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def get(self, request, image_id):
        u = request.user
        q = Estimation.objects.filter(image_id=image_id)
        if u.is_superuser:
            pass
        elif u.groups.filter(name='demo').exists():
            q = q.filter(row__field__farm__is_demo_visible=True)
        else:
            q = q.filter(row__field__farm__owner=u)

        estimation = q.first()
        if not estimation:
            raise APIError("404_NOT_FOUND", "Estimation not found.", status.HTTP_404_NOT_FOUND)
        return self.success(EstimationSerializer(estimation).data)


    
 
class MLResultView(BaseAPIView):  
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    def post(self, request, image_id):
        logger.debug(f"🔍 Incoming ML result POST for image_id={image_id}")
        logger.debug(f"📦 Raw request data: {request.data}")

        try:
            image = get_object_or_error(Image, id=image_id)
        except APIError as e:
            logger.error(f"❌ Image not found for ML result (image_id={image_id}): {str(e)}")
            raise

        
        try:
            fruit_plant = float(request.data.get("fruit_plant"))
        except (TypeError, ValueError):
            raise APIError("INVALID_PARAMETER", "fruit_plant must be a numeric value.", status.HTTP_400_BAD_REQUEST)
        
        confidence_score = request.data.get("confidence_score")
        processed = request.data.get("processed")

        # Convert processed from string to boolean if needed
        if isinstance(processed, str):
            processed = processed.lower() in ["true", "1", "yes"]

        logger.debug(f"🧮 Parsed ML data: fruit_plant={fruit_plant}, confidence_score={confidence_score}, processed={processed}")

        if fruit_plant is None or confidence_score is None or processed is None:
            logger.warning(f"⚠️ Missing parameters in ML payload: {request.data}")
            raise APIError("MISSING_PARAMETER", "Required: fruit_plant, confidence_score, processed", status.HTTP_400_BAD_REQUEST)

        image.processed = processed
        image.processed_at = timezone.now()
        image.status = Image.ImageStatus.DONE if processed else Image.ImageStatus.FAILED  
        image.save()

        logger.info(f"✅ Updated image {image_id} with processed={processed}")

        if not Estimation.objects.filter(image=image).exists():
            row = image.row

            logger.info(f"📈 Creating new estimation for image {image.id}: fruit_plant : {fruit_plant}")

            Estimation.objects.create(
                image=image,
                date=image.date or timezone.now().date(),
                row=row,
                fruit_plant=fruit_plant,
                confidence_score=confidence_score or 0,
                source='MLI'
            )
        else:
            logger.info(f"🟡 Estimation already exists for image {image.id}")

        return self.success({"message": "ML result successfully received."})

 

class ManualEstimationView(BaseAPIView):
    permission_classes = [IsAuthenticated, FarmerOrReadOnlyDemo]
    parser_classes = [MultiPartParser]

    def post(self, request):
        data = request.data

        row_id = data.get("row_id")
        date = data.get("date")
        xy_location = data.get("xy_location")

        if not all([row_id, date]):
            return self.error("MISSING_FIELDS", "Required fields: row_id, date, fruit_plant")

        try:
            fruit_plant = float(data.get("fruit_plant"))
        except (TypeError, ValueError):
            raise APIError("INVALID_PARAMETER", "fruit_plant must be a numeric value.", status.HTTP_400_BAD_REQUEST)

        try:
            maturation_grade = float(data.get("maturation_grade", 0.0))
        except (TypeError, ValueError):
            maturation_grade = 0.0

        confidence_score_raw = data.get("confidence_score")
        try:
            confidence_score = float(confidence_score_raw) if confidence_score_raw is not None else None
        except (TypeError, ValueError):
            confidence_score = None

        image_file = request.FILES.get("image", None)
        logger.info(f"🟡 ManualEstimationView row {row_id} xy_location {xy_location}")

        row = get_object_or_error(Row, id=row_id)
        fruit = row.fruit
        image = None

        try:
            with transaction.atomic():
                if image_file:
                    original_filename = image_file.name
                    temp_path = default_storage.save(f'images/temp_manual_{original_filename}', image_file)
                    ext = os.path.splitext(original_filename)[1]
                    image = Image.objects.create(
                        row=row,
                        date=date,
                        upload_date=timezone.now().date(),
                        processed=True,
                        processed_at=timezone.now(),
                        user_fruit_plant=fruit_plant,
                        status=Image.ImageStatus.DONE,
                        original_filename=original_filename,
                        xy_location=xy_location
                    )
                    final_path = f"images/image-{image.id}{ext}"
                    os.rename(
                        os.path.join(settings.MEDIA_ROOT, temp_path),
                        os.path.join(settings.MEDIA_ROOT, final_path)
                    )
                    image.image_file.name = final_path
                else:
                    image = Image.objects.create(
                        row=row,
                        date=date,
                        upload_date=timezone.now().date(),
                        processed=True,
                        processed_at=timezone.now(),
                        user_fruit_plant=fruit_plant,
                        status=Image.ImageStatus.DONE,
                        original_filename=None,
                        image_file="images/image_default.jpg",
                        xy_location=xy_location
                    )

                image.save()  # Commit after image is finalized

                estimation = Estimation.objects.create(
                    image=image,
                    row=row,
                    date=date,
                    fruit_plant=fruit_plant,
                    confidence_score=confidence_score,
                    maturation_grade=maturation_grade,
                    source=Estimation.EstimationSource.USER
                )
                estimation.save()

        except Exception as e:
            if image:
                image.delete()
            raise APIError("ESTIMATION_FAILED", f"Failed to save estimation: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = EstimationSerializer(estimation, context={'request': request})
        return self.success({
            "image_id": image.id,
            "estimation_id": estimation.id,
            "estimations": serializer.data
        }, status_code=201)
